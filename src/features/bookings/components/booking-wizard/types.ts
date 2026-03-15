'use client'

import type {
  BookingFrequencyCode,
  TimeWindowCode,
  Customer,
  Property,
  Service,
  AddOn,
} from '@/types/database'

export type WizardStep = 'customer' | 'service' | 'schedule' | 'review'

export const WIZARD_STEPS: WizardStep[] = ['customer', 'service', 'schedule', 'review']

export const STEP_LABELS: Record<WizardStep, string> = {
  customer: 'Customer & Property',
  service: 'Service & Add-ons',
  schedule: 'Schedule',
  review: 'Review & Confirm',
}

export type WizardData = {
  // Step 1: Customer & Property
  customerId: string | null
  propertyId: string | null
  customer: Customer | null
  property: Property | null

  // Step 2: Service & Add-ons
  serviceId: string | null
  service: Service | null
  selectedAddOnIds: string[]
  addOns: AddOn[]
  frequency: BookingFrequencyCode

  // Step 3: Schedule
  scheduledDate: string | null
  scheduledTimeWindow: TimeWindowCode | null
  scheduledTimeStart: string | null
  customerNotes: string

  // Computed/derived
  isDeepCleanRequired: boolean
  deepCleanReason: string | null
  firstOccurrenceOverrideServiceId: string | null
  firstOccurrenceOverrideService: Service | null
}

export type WizardState = {
  // Current step
  currentStep: WizardStep

  // Booking ID (if editing existing draft)
  bookingId: string | null

  // Form data
  data: WizardData

  // UI state
  isLoading: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  hasUnsavedChanges: boolean
  errors: Partial<Record<keyof WizardData, string>>
}

export type WizardActions = {
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (updates: Partial<WizardData>) => void
  setCustomer: (customer: Customer | null, property?: Property | null) => void
  setProperty: (property: Property | null) => void
  setService: (service: Service | null) => void
  toggleAddOn: (addOn: AddOn) => void
  setFrequency: (frequency: BookingFrequencyCode) => void
  setSchedule: (date: string | null, timeWindow: TimeWindowCode | null, timeStart: string | null) => void
  setCustomerNotes: (notes: string) => void
  saveDraft: () => Promise<string | null>
  sendQuote: () => Promise<boolean>
  confirmBooking: () => Promise<boolean>
  reset: () => void
}

export type PricingBreakdownItem = {
  label: string
  amount: number
  type: 'base' | 'addon' | 'adjustment' | 'total'
}

export type PricingSummary = {
  items: PricingBreakdownItem[]
  subtotal: number
  adjustmentsTotal: number
  total: number
  isLoading: boolean
}

export const INITIAL_WIZARD_DATA: WizardData = {
  customerId: null,
  propertyId: null,
  customer: null,
  property: null,
  serviceId: null,
  service: null,
  selectedAddOnIds: [],
  addOns: [],
  frequency: 'onetime',
  scheduledDate: null,
  scheduledTimeWindow: null,
  scheduledTimeStart: null,
  customerNotes: '',
  isDeepCleanRequired: false,
  deepCleanReason: null,
  firstOccurrenceOverrideServiceId: null,
  firstOccurrenceOverrideService: null,
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'customer',
  bookingId: null,
  data: INITIAL_WIZARD_DATA,
  isLoading: false,
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,
  errors: {},
}
