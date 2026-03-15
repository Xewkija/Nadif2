'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
  useService,
  useCreateService,
  useUpdateService,
  useServices,
  type CreateServiceInput,
} from '@/features/services/hooks'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import type { ServiceTypeCode, BookingFrequencyCode } from '@/types/database'

interface ServiceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceId: string | null
}

type ServiceFormValues = {
  name: string
  description: string
  service_type: ServiceTypeCode
  base_price_cents: number
  estimated_duration_minutes: number
  requires_quote: boolean
  is_recurring_eligible: boolean
  allowed_frequencies: BookingFrequencyCode[]
  first_occurrence_override_service_id: string
}

const serviceTypeOptions: { value: ServiceTypeCode; label: string }[] = [
  { value: 'standard', label: 'Standard Cleaning' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'post_construction', label: 'Post Construction' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'specialty', label: 'Specialty' },
]

const frequencyOptions: { value: BookingFrequencyCode; label: string }[] = [
  { value: 'onetime', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function ServiceSheet({ open, onOpenChange, serviceId }: ServiceSheetProps) {
  const isEditing = !!serviceId
  const { data: service, isLoading: isLoadingService } = useService(serviceId ?? undefined)
  const { data: allServices } = useServices()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    defaultValues: {
      name: '',
      description: '',
      service_type: 'standard',
      base_price_cents: 0,
      estimated_duration_minutes: 120,
      requires_quote: false,
      is_recurring_eligible: true,
      allowed_frequencies: ['onetime', 'weekly', 'biweekly', 'monthly'],
      first_occurrence_override_service_id: '',
    },
  })

  const watchServiceType = watch('service_type')
  const watchIsRecurringEligible = watch('is_recurring_eligible')

  // Deep clean services that can be used as first occurrence overrides
  const overrideServiceOptions = allServices?.filter(
    (s) => s.service_type === 'deep' && s.id !== serviceId && s.is_active
  ) ?? []

  // Reset form when service data loads or when opening for new service
  useEffect(() => {
    if (isEditing && service) {
      reset({
        name: service.name,
        description: service.description ?? '',
        service_type: service.service_type,
        base_price_cents: service.base_price_cents,
        estimated_duration_minutes: service.estimated_duration_minutes,
        requires_quote: service.requires_quote,
        is_recurring_eligible: service.is_recurring_eligible,
        allowed_frequencies: (service.allowed_frequencies as BookingFrequencyCode[]) ?? [],
        first_occurrence_override_service_id: service.first_occurrence_override_service_id ?? '',
      })
    } else if (!isEditing && open) {
      reset({
        name: '',
        description: '',
        service_type: 'standard',
        base_price_cents: 0,
        estimated_duration_minutes: 120,
        requires_quote: false,
        is_recurring_eligible: true,
        allowed_frequencies: ['onetime', 'weekly', 'biweekly', 'monthly'],
        first_occurrence_override_service_id: '',
      })
    }
  }, [service, isEditing, open, reset])

  const onSubmit = async (data: ServiceFormValues) => {
    const input: CreateServiceInput = {
      name: data.name,
      description: data.description || undefined,
      service_type: data.service_type,
      base_price_cents: Math.round(data.base_price_cents * 100),
      estimated_duration_minutes: data.estimated_duration_minutes,
      requires_quote: data.requires_quote,
      is_recurring_eligible: data.is_recurring_eligible,
      allowed_frequencies: data.allowed_frequencies,
      first_occurrence_override_service_id: data.first_occurrence_override_service_id || undefined,
    }

    if (isEditing && serviceId) {
      await updateMutation.mutateAsync({ id: serviceId, ...input })
    } else {
      await createMutation.mutateAsync(input)
    }

    onOpenChange(false)
  }

  const handleFrequencyToggle = (freq: BookingFrequencyCode) => {
    const current = watch('allowed_frequencies')
    if (current.includes(freq)) {
      setValue('allowed_frequencies', current.filter(f => f !== freq))
    } else {
      setValue('allowed_frequencies', [...current, freq])
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Service' : 'New Service'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the service details below.'
              : 'Create a new service for your catalog.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing && isLoadingService ? (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 py-6 space-y-6 overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Service Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Standard Cleaning"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this service includes..."
                    rows={3}
                    {...register('description')}
                  />
                </div>
              </div>

              <Separator />

              {/* Service Type & Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Type & Pricing</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_type">
                      Service Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={watchServiceType}
                      onValueChange={(value) => setValue('service_type', value as ServiceTypeCode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_price">
                      Base Price ($) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="base_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...register('base_price_cents', {
                        required: 'Price is required',
                        min: { value: 0, message: 'Price must be positive' },
                      })}
                    />
                    {errors.base_price_cents && (
                      <p className="text-sm text-destructive">{errors.base_price_cents.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the price in dollars (e.g., 150)
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    {...register('estimated_duration_minutes', {
                      min: { value: 15, message: 'Duration must be at least 15 minutes' },
                    })}
                  />
                  {errors.estimated_duration_minutes && (
                    <p className="text-sm text-destructive">
                      {errors.estimated_duration_minutes.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Booking Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Booking Options</h3>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requires_quote"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register('requires_quote')}
                  />
                  <div>
                    <Label htmlFor="requires_quote" className="cursor-pointer">
                      Requires Quote
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Bookings for this service will require a quote before confirmation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_recurring_eligible"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register('is_recurring_eligible')}
                  />
                  <div>
                    <Label htmlFor="is_recurring_eligible" className="cursor-pointer">
                      Allow Recurring
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      This service can be scheduled as a recurring appointment
                    </p>
                  </div>
                </div>

                {watchIsRecurringEligible && (
                  <div className="space-y-2 pl-7">
                    <Label>Allowed Frequencies</Label>
                    <div className="flex flex-wrap gap-2">
                      {frequencyOptions.map((freq) => {
                        const isSelected = watch('allowed_frequencies').includes(freq.value)
                        return (
                          <button
                            key={freq.value}
                            type="button"
                            onClick={() => handleFrequencyToggle(freq.value)}
                            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input hover:bg-muted'
                            }`}
                          >
                            {freq.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* First Occurrence Override - Only show for maintenance services */}
              {watchIsRecurringEligible && watchServiceType === 'standard' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">First Occurrence Override</h3>
                    <p className="text-sm text-muted-foreground">
                      When this service is booked as a recurring series, the first appointment
                      can use a different (typically deeper) service.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="override_service">Override Service</Label>
                      <Select
                        value={watch('first_occurrence_override_service_id') || 'none'}
                        onValueChange={(value) =>
                          setValue('first_occurrence_override_service_id', value === 'none' ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Use tenant default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Use tenant default</SelectItem>
                          {overrideServiceOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        If not set, the tenant&apos;s default override service will be used.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <SheetFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Service'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
