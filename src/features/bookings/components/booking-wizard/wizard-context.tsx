'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'
import type {
  Customer,
  Property,
  Service,
  AddOn,
  BookingFrequencyCode,
  TimeWindowCode,
  BookingRpcResult,
  Json,
} from '@/types/database'
import {
  type WizardState,
  type WizardActions,
  type WizardStep,
  type WizardData,
  WIZARD_STEPS,
  INITIAL_WIZARD_STATE,
  INITIAL_WIZARD_DATA,
} from './types'

type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'UPDATE_DATA'; updates: Partial<WizardData> }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_SAVED'; bookingId: string }
  | { type: 'SET_ERROR'; field: keyof WizardData; error: string | null }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'MARK_UNSAVED' }
  | { type: 'RESET' }
  | { type: 'LOAD_BOOKING'; state: Partial<WizardState> }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'UPDATE_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.updates },
        hasUnsavedChanges: true,
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }

    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving }

    case 'SET_SAVED':
      return {
        ...state,
        bookingId: action.bookingId,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: new Date(),
      }

    case 'SET_ERROR':
      return {
        ...state,
        errors: action.error
          ? { ...state.errors, [action.field]: action.error }
          : Object.fromEntries(
              Object.entries(state.errors).filter(([k]) => k !== action.field)
            ),
      }

    case 'CLEAR_ERRORS':
      return { ...state, errors: {} }

    case 'MARK_UNSAVED':
      return { ...state, hasUnsavedChanges: true }

    case 'RESET':
      return INITIAL_WIZARD_STATE

    case 'LOAD_BOOKING':
      return { ...state, ...action.state, isLoading: false }

    default:
      return state
  }
}

type WizardContextValue = {
  state: WizardState
  actions: WizardActions
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}

type WizardProviderProps = {
  children: ReactNode
  bookingId?: string | null
}

export function WizardProvider({ children, bookingId: initialBookingId }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...INITIAL_WIZARD_STATE,
    bookingId: initialBookingId ?? null,
  })

  const { data: workspace } = useActiveWorkspace()
  const queryClient = useQueryClient()
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load existing booking if editing
  useEffect(() => {
    if (initialBookingId && workspace) {
      loadBooking(initialBookingId)
    }
  }, [initialBookingId, workspace])

  // Auto-save debounce (8 seconds)
  useEffect(() => {
    if (state.hasUnsavedChanges && state.bookingId && !state.isSaving) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft()
      }, 8000)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [state.hasUnsavedChanges, state.bookingId, state.isSaving, state.data])

  const loadBooking = async (bookingId: string) => {
    dispatch({ type: 'SET_LOADING', isLoading: true })

    try {
      const supabase = createClient()
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(*),
          property:properties(*),
          service:services(*),
          add_ons:booking_add_ons(
            *,
            add_on:add_ons(*)
          )
        `)
        .eq('id', bookingId)
        .single()

      if (error) throw error

      const addOns = booking.add_ons
        ?.map((ba: { add_on: AddOn }) => ba.add_on)
        .filter(Boolean) ?? []

      dispatch({
        type: 'LOAD_BOOKING',
        state: {
          bookingId,
          data: {
            customerId: booking.customer_id,
            propertyId: booking.property_id,
            customer: booking.customer,
            property: booking.property,
            serviceId: booking.service_id,
            service: booking.service,
            selectedAddOnIds: addOns.map((a: AddOn) => a.id),
            addOns,
            frequency: booking.frequency ?? 'onetime',
            scheduledDate: booking.scheduled_date,
            scheduledTimeWindow: booking.scheduled_time_window,
            scheduledTimeStart: booking.scheduled_time_start,
            customerNotes: booking.customer_notes ?? '',
            isDeepCleanRequired: false,
            deepCleanReason: null,
            firstOccurrenceOverrideServiceId: null,
            firstOccurrenceOverrideService: null,
          },
        },
      })
    } catch (error) {
      console.error('Failed to load booking:', error)
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
  }

  const setStep = useCallback((step: WizardStep) => {
    // Save on step change if we have unsaved changes
    if (state.hasUnsavedChanges && state.bookingId) {
      saveDraft()
    }
    dispatch({ type: 'SET_STEP', step })
  }, [state.hasUnsavedChanges, state.bookingId])

  const nextStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep)
    if (currentIndex < WIZARD_STEPS.length - 1) {
      setStep(WIZARD_STEPS[currentIndex + 1])
    }
  }, [state.currentStep, setStep])

  const prevStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.currentStep)
    if (currentIndex > 0) {
      setStep(WIZARD_STEPS[currentIndex - 1])
    }
  }, [state.currentStep, setStep])

  const updateData = useCallback((updates: Partial<WizardData>) => {
    dispatch({ type: 'UPDATE_DATA', updates })
  }, [])

  const setCustomer = useCallback((customer: Customer | null, property?: Property | null) => {
    dispatch({
      type: 'UPDATE_DATA',
      updates: {
        customerId: customer?.id ?? null,
        customer,
        propertyId: property?.id ?? null,
        property: property ?? null,
      },
    })
  }, [])

  const setProperty = useCallback((property: Property | null) => {
    dispatch({
      type: 'UPDATE_DATA',
      updates: {
        propertyId: property?.id ?? null,
        property,
      },
    })
  }, [])

  const setService = useCallback((service: Service | null) => {
    dispatch({
      type: 'UPDATE_DATA',
      updates: {
        serviceId: service?.id ?? null,
        service,
        // Reset add-ons when service changes
        selectedAddOnIds: [],
        addOns: [],
      },
    })
  }, [])

  const toggleAddOn = useCallback((addOn: AddOn) => {
    const { selectedAddOnIds, addOns } = state.data
    const isSelected = selectedAddOnIds.includes(addOn.id)

    dispatch({
      type: 'UPDATE_DATA',
      updates: {
        selectedAddOnIds: isSelected
          ? selectedAddOnIds.filter((id) => id !== addOn.id)
          : [...selectedAddOnIds, addOn.id],
        addOns: isSelected
          ? addOns.filter((a) => a.id !== addOn.id)
          : [...addOns, addOn],
      },
    })
  }, [state.data.selectedAddOnIds, state.data.addOns])

  const setFrequency = useCallback((frequency: BookingFrequencyCode) => {
    dispatch({ type: 'UPDATE_DATA', updates: { frequency } })
  }, [])

  const setSchedule = useCallback((
    scheduledDate: string | null,
    scheduledTimeWindow: TimeWindowCode | null,
    scheduledTimeStart: string | null
  ) => {
    dispatch({
      type: 'UPDATE_DATA',
      updates: { scheduledDate, scheduledTimeWindow, scheduledTimeStart },
    })
  }, [])

  const setCustomerNotes = useCallback((customerNotes: string) => {
    dispatch({ type: 'UPDATE_DATA', updates: { customerNotes } })
  }, [])

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!workspace) return null

    dispatch({ type: 'SET_SAVING', isSaving: true })

    try {
      const supabase = createClient()
      const { data } = state

      if (state.bookingId) {
        // Update existing draft
        const updates: Record<string, unknown> = {}
        if (data.serviceId) updates.service_id = data.serviceId
        if (data.scheduledDate) updates.scheduled_date = data.scheduledDate
        if (data.scheduledTimeWindow) updates.scheduled_time_window = data.scheduledTimeWindow
        if (data.scheduledTimeStart) updates.scheduled_time_start = data.scheduledTimeStart
        if (data.customerNotes !== undefined) updates.customer_notes = data.customerNotes

        const { data: result, error } = await supabase.rpc('update_draft_booking', {
          p_booking_id: state.bookingId,
          p_updates: updates as unknown as Json,
        })

        if (error) throw error
        const rpcResult = result as BookingRpcResult
        if (!rpcResult.success) throw new Error(rpcResult.error)

        dispatch({ type: 'SET_SAVED', bookingId: state.bookingId })
        return state.bookingId
      } else {
        // Create new draft
        if (!data.customerId || !data.propertyId || !data.serviceId) {
          dispatch({ type: 'SET_SAVING', isSaving: false })
          return null
        }

        const { data: result, error } = await supabase.rpc('create_draft_booking', {
          p_customer_id: data.customerId,
          p_property_id: data.propertyId,
          p_service_id: data.serviceId,
          p_frequency: data.frequency,
          p_scheduled_date: data.scheduledDate ?? undefined,
          p_scheduled_time_window: data.scheduledTimeWindow ?? undefined,
          p_customer_notes: data.customerNotes || undefined,
        })

        if (error) throw error
        const rpcResult = result as BookingRpcResult
        if (!rpcResult.success) throw new Error(rpcResult.error)

        const bookingId = rpcResult.booking_id!
        dispatch({ type: 'SET_SAVED', bookingId })

        // Add add-ons if any
        if (data.selectedAddOnIds.length > 0) {
          const addOnsData = data.selectedAddOnIds.map((id) => ({
            add_on_id: id,
            quantity: 1,
          }))
          await supabase.rpc('add_booking_add_ons', {
            p_booking_id: bookingId,
            p_add_ons: addOnsData as unknown as Json,
          })
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })

        return bookingId
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      dispatch({ type: 'SET_SAVING', isSaving: false })
      return null
    }
  }, [workspace, state, queryClient])

  const sendQuote = useCallback(async (): Promise<boolean> => {
    if (!workspace) return false

    // Save first to ensure we have a booking ID
    let bookingId = state.bookingId
    if (!bookingId) {
      bookingId = await saveDraft()
      if (!bookingId) return false
    }

    dispatch({ type: 'SET_SAVING', isSaving: true })

    try {
      const supabase = createClient()
      const { data: result, error } = await supabase.rpc('send_quote', {
        p_booking_id: bookingId,
      })

      if (error) throw error
      const rpcResult = result as BookingRpcResult
      if (!rpcResult.success) throw new Error(rpcResult.error)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(workspace.tenantId, bookingId) })

      dispatch({ type: 'SET_SAVING', isSaving: false })
      return true
    } catch (error) {
      console.error('Failed to send quote:', error)
      dispatch({ type: 'SET_SAVING', isSaving: false })
      return false
    }
  }, [workspace, state.bookingId, saveDraft, queryClient])

  const confirmBooking = useCallback(async (): Promise<boolean> => {
    if (!workspace) return false

    const { data } = state

    // For recurring bookings, use create_recurring_series instead
    if (data.frequency !== 'onetime') {
      if (!data.customerId || !data.propertyId || !data.serviceId || !data.scheduledDate) {
        return false
      }

      dispatch({ type: 'SET_SAVING', isSaving: true })

      try {
        const supabase = createClient()
        const { data: result, error } = await supabase.rpc('create_recurring_series', {
          p_customer_id: data.customerId,
          p_property_id: data.propertyId,
          p_service_id: data.serviceId,
          p_frequency: data.frequency,
          p_start_date: data.scheduledDate,
          p_preferred_day_of_week: data.scheduledDate
            ? new Date(data.scheduledDate).getDay()
            : undefined,
          p_preferred_time_window: data.scheduledTimeWindow ?? 'anytime',
          p_notes: data.customerNotes || undefined,
          p_generate_first_occurrence: true,
        })

        if (error) throw error
        const rpcResult = result as { success: boolean; series_id?: string; first_booking_id?: string; error?: string }
        if (!rpcResult.success) throw new Error(rpcResult.error)

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.recurringSeries(workspace.tenantId) })

        dispatch({ type: 'SET_SAVING', isSaving: false })
        return true
      } catch (error) {
        console.error('Failed to create recurring series:', error)
        dispatch({ type: 'SET_SAVING', isSaving: false })
        return false
      }
    }

    // For one-time bookings, save draft first then confirm
    let bookingId = state.bookingId
    if (!bookingId) {
      bookingId = await saveDraft()
      if (!bookingId) return false
    }

    dispatch({ type: 'SET_SAVING', isSaving: true })

    try {
      const supabase = createClient()
      const { data: result, error } = await supabase.rpc('confirm_booking', {
        p_booking_id: bookingId,
      })

      if (error) throw error
      const rpcResult = result as BookingRpcResult
      if (!rpcResult.success) throw new Error(rpcResult.error)

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(workspace.tenantId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(workspace.tenantId, bookingId) })

      dispatch({ type: 'SET_SAVING', isSaving: false })
      return true
    } catch (error) {
      console.error('Failed to confirm booking:', error)
      dispatch({ type: 'SET_SAVING', isSaving: false })
      return false
    }
  }, [workspace, state, saveDraft, queryClient])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const actions: WizardActions = {
    setStep,
    nextStep,
    prevStep,
    updateData,
    setCustomer,
    setProperty,
    setService,
    toggleAddOn,
    setFrequency,
    setSchedule,
    setCustomerNotes,
    saveDraft,
    sendQuote,
    confirmBooking,
    reset,
  }

  return (
    <WizardContext.Provider value={{ state, actions }}>
      {children}
    </WizardContext.Provider>
  )
}
