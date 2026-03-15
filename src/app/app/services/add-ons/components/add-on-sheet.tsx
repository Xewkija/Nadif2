'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
  useAddOn,
  useCreateAddOn,
  useUpdateAddOn,
  useServices,
  type CreateAddOnInput,
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
import type { AddOnScopeMode, ServiceTypeCode } from '@/types/database'

interface AddOnSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addOnId: string | null
}

type AddOnFormValues = {
  name: string
  description: string
  price_cents: number
  price_type: 'flat' | 'per_room' | 'per_sqft' | 'hourly'
  scope_mode: AddOnScopeMode
  scoped_service_ids: string[]
  scoped_service_types: ServiceTypeCode[]
}

const priceTypeOptions = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per_room', label: 'Per Room' },
  { value: 'per_sqft', label: 'Per Square Foot' },
  { value: 'hourly', label: 'Hourly' },
]

const scopeModeOptions = [
  { value: 'all_services', label: 'Available for all services' },
  { value: 'specific_services', label: 'Specific services only' },
  { value: 'service_types', label: 'Specific service types' },
]

const serviceTypeOptions: { value: ServiceTypeCode; label: string }[] = [
  { value: 'standard', label: 'Standard Cleaning' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'move_in', label: 'Move In' },
  { value: 'move_out', label: 'Move Out' },
  { value: 'post_construction', label: 'Post Construction' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'specialty', label: 'Specialty' },
]

export function AddOnSheet({ open, onOpenChange, addOnId }: AddOnSheetProps) {
  const isEditing = !!addOnId
  const { data: addOn, isLoading: isLoadingAddOn } = useAddOn(addOnId ?? undefined)
  const { data: services } = useServices()
  const createMutation = useCreateAddOn()
  const updateMutation = useUpdateAddOn()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddOnFormValues>({
    defaultValues: {
      name: '',
      description: '',
      price_cents: 0,
      price_type: 'flat',
      scope_mode: 'all_services',
      scoped_service_ids: [],
      scoped_service_types: [],
    },
  })

  const watchScopeMode = watch('scope_mode')
  const watchPriceType = watch('price_type')
  const watchScopedServiceIds = watch('scoped_service_ids')
  const watchScopedServiceTypes = watch('scoped_service_types')

  // Reset form when add-on data loads or when opening for new add-on
  useEffect(() => {
    if (isEditing && addOn) {
      reset({
        name: addOn.name,
        description: addOn.description ?? '',
        price_cents: addOn.price_cents / 100, // Convert to dollars for display
        price_type: addOn.price_type as AddOnFormValues['price_type'],
        scope_mode: addOn.scope_mode,
        scoped_service_ids: (addOn.scoped_service_ids as string[]) ?? [],
        scoped_service_types: (addOn.scoped_service_types as ServiceTypeCode[]) ?? [],
      })
    } else if (!isEditing && open) {
      reset({
        name: '',
        description: '',
        price_cents: 0,
        price_type: 'flat',
        scope_mode: 'all_services',
        scoped_service_ids: [],
        scoped_service_types: [],
      })
    }
  }, [addOn, isEditing, open, reset])

  const onSubmit = async (data: AddOnFormValues) => {
    const input: CreateAddOnInput = {
      name: data.name,
      description: data.description || undefined,
      price_cents: Math.round(data.price_cents * 100), // Convert to cents
      price_type: data.price_type,
      scope_mode: data.scope_mode,
      scoped_service_ids: data.scope_mode === 'specific_services' ? data.scoped_service_ids : undefined,
      scoped_service_types: data.scope_mode === 'service_types' ? data.scoped_service_types : undefined,
    }

    if (isEditing && addOnId) {
      await updateMutation.mutateAsync({ id: addOnId, ...input })
    } else {
      await createMutation.mutateAsync(input)
    }

    onOpenChange(false)
  }

  const handleServiceToggle = (serviceId: string) => {
    const current = watchScopedServiceIds
    if (current.includes(serviceId)) {
      setValue('scoped_service_ids', current.filter(id => id !== serviceId))
    } else {
      setValue('scoped_service_ids', [...current, serviceId])
    }
  }

  const handleServiceTypeToggle = (type: ServiceTypeCode) => {
    const current = watchScopedServiceTypes
    if (current.includes(type)) {
      setValue('scoped_service_types', current.filter(t => t !== type))
    } else {
      setValue('scoped_service_types', [...current, type])
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Add-on' : 'New Add-on'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the add-on details below.'
              : 'Create a new add-on service customers can add to their bookings.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing && isLoadingAddOn ? (
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
                    Add-on Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Inside Fridge"
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
                    placeholder="Describe what this add-on includes..."
                    rows={2}
                    {...register('description')}
                  />
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Pricing</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">
                      Price ($) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...register('price_cents', {
                        required: 'Price is required',
                        min: { value: 0, message: 'Price must be positive' },
                      })}
                    />
                    {errors.price_cents && (
                      <p className="text-sm text-destructive">{errors.price_cents.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_type">Price Type</Label>
                    <Select
                      value={watchPriceType}
                      onValueChange={(value) => setValue('price_type', value as AddOnFormValues['price_type'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {priceTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Scope */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Availability</h3>

                <div className="space-y-2">
                  <Label htmlFor="scope_mode">When can this add-on be selected?</Label>
                  <Select
                    value={watchScopeMode}
                    onValueChange={(value) => setValue('scope_mode', value as AddOnScopeMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {watchScopeMode === 'specific_services' && services && (
                  <div className="space-y-2">
                    <Label>Select Services</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                      {services.length > 0 ? (
                        services.map((service) => {
                          const isSelected = watchScopedServiceIds.includes(service.id)
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleServiceToggle(service.id)}
                              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-input hover:bg-muted'
                              }`}
                            >
                              {service.name}
                            </button>
                          )
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">No services available</p>
                      )}
                    </div>
                  </div>
                )}

                {watchScopeMode === 'service_types' && (
                  <div className="space-y-2">
                    <Label>Select Service Types</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                      {serviceTypeOptions.map((type) => {
                        const isSelected = watchScopedServiceTypes.includes(type.value)
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleServiceTypeToggle(type.value)}
                            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input hover:bg-muted'
                            }`}
                          >
                            {type.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
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
                {isEditing ? 'Save Changes' : 'Create Add-on'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
