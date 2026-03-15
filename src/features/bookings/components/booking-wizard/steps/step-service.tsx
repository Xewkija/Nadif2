'use client'

import { useEffect } from 'react'
import { Check, Sparkles, Clock, Repeat, AlertCircle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useServices } from '@/features/services/hooks/use-services'
import { useAddOns } from '@/features/services/hooks/use-add-ons'
import { useResolveFirstOccurrenceOverride } from '@/features/recurring/hooks'
import { useWizard } from '../wizard-context'
import { PricingSummary } from '../pricing-summary'
import type { Service, AddOn, ServiceTypeCode, BookingFrequencyCode } from '@/types/database'

const serviceTypeLabels: Record<ServiceTypeCode, string> = {
  standard: 'Standard Clean',
  deep: 'Deep Clean',
  move_in: 'Move-In Clean',
  move_out: 'Move-Out Clean',
  post_construction: 'Post-Construction',
  commercial: 'Commercial',
  specialty: 'Specialty',
}

const serviceTypeColors: Record<ServiceTypeCode, string> = {
  standard: 'bg-blue-100 text-blue-800',
  deep: 'bg-purple-100 text-purple-800',
  move_in: 'bg-green-100 text-green-800',
  move_out: 'bg-orange-100 text-orange-800',
  post_construction: 'bg-amber-100 text-amber-800',
  commercial: 'bg-slate-100 text-slate-800',
  specialty: 'bg-pink-100 text-pink-800',
}

const frequencyOptions: { value: BookingFrequencyCode; label: string; description: string }[] = [
  { value: 'onetime', label: 'One-time', description: 'Single service visit' },
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
]

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function StepService() {
  const { state, actions } = useWizard()
  const { data } = state

  const { data: services, isLoading: isLoadingServices } = useServices()
  const { data: addOns, isLoading: isLoadingAddOns } = useAddOns()
  const resolveOverrideMutation = useResolveFirstOccurrenceOverride()

  // Check for first occurrence override when service changes or frequency becomes recurring
  useEffect(() => {
    if (data.serviceId && data.frequency !== 'onetime' && !data.firstOccurrenceOverrideServiceId) {
      resolveOverrideMutation.mutate(data.serviceId, {
        onSuccess: (result) => {
          if (result.success && result.override_service_id) {
            actions.updateData({
              firstOccurrenceOverrideServiceId: result.override_service_id,
              // Store override service info for display
              firstOccurrenceOverrideService: services?.find(
                (s) => s.id === result.override_service_id
              ) ?? null,
            })
          }
        },
      })
    } else if (data.frequency === 'onetime') {
      // Clear override when switching back to one-time
      if (data.firstOccurrenceOverrideServiceId) {
        actions.updateData({
          firstOccurrenceOverrideServiceId: null,
          firstOccurrenceOverrideService: null,
        })
      }
    }
  }, [data.serviceId, data.frequency])

  // Filter add-ons based on selected service
  const availableAddOns = addOns?.filter((addOn) => {
    if (!data.serviceId) return false

    if (addOn.scope_mode === 'all_services') return addOn.is_active

    if (addOn.scope_mode === 'specific_services') {
      const scopedIds = addOn.scoped_service_ids as string[] | null
      return scopedIds?.includes(data.serviceId) && addOn.is_active
    }

    if (addOn.scope_mode === 'service_types' && data.service) {
      const scopedTypes = addOn.scoped_service_types as string[] | null
      return scopedTypes?.includes(data.service.service_type) && addOn.is_active
    }

    return false
  }) ?? []

  const handleSelectService = (service: Service) => {
    actions.setService(service)
  }

  const handleToggleAddOn = (addOn: AddOn) => {
    actions.toggleAddOn(addOn)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Service Selection */}
        <div>
          <h3 className="font-medium mb-3">Select Service</h3>

          {isLoadingServices ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading services...
            </div>
          ) : services && services.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {services
                .filter((s) => s.is_active && !s.archived_at)
                .map((service) => {
                  const isSelected = data.serviceId === service.id
                  return (
                    <Card
                      key={service.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50 hover:shadow-sm'
                      )}
                      onClick={() => handleSelectService(service)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="font-medium">{service.name}</span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn('text-xs', serviceTypeColors[service.service_type])}
                            >
                              {serviceTypeLabels[service.service_type]}
                            </Badge>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {service.estimated_duration_minutes} min
                          </div>
                          <span className="font-semibold">
                            {formatPrice(service.base_price_cents)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No services available</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Frequency Selection */}
        {data.serviceId && (
          <>
            <Separator />

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Frequency
              </h3>

              <RadioGroup
                value={data.frequency}
                onValueChange={(value) => actions.setFrequency(value as BookingFrequencyCode)}
                className="grid sm:grid-cols-2 gap-3"
              >
                {frequencyOptions.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`freq-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`freq-${option.value}`}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                        'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                        'hover:bg-muted/50'
                      )}
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {data.frequency !== 'onetime' && (
                <div className="mt-3 space-y-3">
                  {data.firstOccurrenceOverrideService ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>First Visit Override</AlertTitle>
                      <AlertDescription>
                        Your first visit will be a <strong>{data.firstOccurrenceOverrideService.name}</strong> to
                        ensure the property is ready for regular {data.service?.name} services.
                        Subsequent visits will be regular {data.service?.name}.
                      </AlertDescription>
                    </Alert>
                  ) : resolveOverrideMutation.isPending ? (
                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                      Checking service requirements...
                    </div>
                  ) : null}

                  <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    Recurring services will create a series of scheduled bookings.
                    You can skip or cancel individual occurrences as needed.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Add-ons */}
        {data.serviceId && availableAddOns.length > 0 && (
          <>
            <Separator />

            <div>
              <h3 className="font-medium mb-3">Add-ons (Optional)</h3>

              <div className="grid sm:grid-cols-2 gap-3">
                {availableAddOns.map((addOn) => {
                  const isSelected = data.selectedAddOnIds.includes(addOn.id)
                  return (
                    <Card
                      key={addOn.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() => handleToggleAddOn(addOn)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{addOn.name}</span>
                              <span className="text-sm font-medium">
                                +{formatPrice(addOn.price_cents)}
                              </span>
                            </div>
                            {addOn.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {addOn.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pricing Summary - Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <PricingSummary />
        </div>
      </div>
    </div>
  )
}
