'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
  useProperty,
  useCreateProperty,
  useUpdateProperty,
  type CreatePropertyInput,
} from '@/features/customers/hooks'
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
import {
  AddressAutocomplete,
  ManualAddressForm,
  MapPreview,
  type AddressResult,
} from '@/components/address'
import type { PropertyType, GeocodeConfidence } from '@/types/database'

interface PropertySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  propertyId?: string | null
}

type PropertyFormValues = {
  // Property details
  property_type: PropertyType | ''
  square_feet: string
  bedrooms: string
  bathrooms: string
  floors: string
  // Access
  access_notes: string
  gate_code: string
  key_location: string
  parking_instructions: string
  // Pets
  has_pets: boolean
  pet_details: string
  // Primary
  is_primary: boolean
}

const propertyTypeOptions: { value: PropertyType; label: string }[] = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'office', label: 'Office' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
]

export function PropertySheet({
  open,
  onOpenChange,
  customerId,
  propertyId,
}: PropertySheetProps) {
  const isEditing = !!propertyId
  const { data: property, isLoading: isLoadingProperty } = useProperty(propertyId ?? undefined)
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()

  const [address, setAddress] = useState<AddressResult | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    defaultValues: {
      property_type: '',
      square_feet: '',
      bedrooms: '',
      bathrooms: '',
      floors: '',
      access_notes: '',
      gate_code: '',
      key_location: '',
      parking_instructions: '',
      has_pets: false,
      pet_details: '',
      is_primary: false,
    },
  })

  const watchPropertyType = watch('property_type')
  const watchHasPets = watch('has_pets')

  // Reset form when property data loads
  useEffect(() => {
    if (isEditing && property) {
      setAddress({
        address_line1: property.address_line1,
        address_line2: property.address_line2 ?? undefined,
        city: property.city,
        state: property.state,
        postal_code: property.postal_code,
        country: property.country,
        google_place_id: property.google_place_id ?? undefined,
        latitude: property.latitude ?? undefined,
        longitude: property.longitude ?? undefined,
        formatted_address: [
          property.address_line1,
          property.address_line2,
          `${property.city}, ${property.state} ${property.postal_code}`,
        ]
          .filter(Boolean)
          .join(', '),
      })
      setCoordinates(
        property.latitude && property.longitude
          ? { lat: property.latitude, lng: property.longitude }
          : null
      )
      reset({
        property_type: property.property_type ?? '',
        square_feet: property.square_feet?.toString() ?? '',
        bedrooms: property.bedrooms?.toString() ?? '',
        bathrooms: property.bathrooms?.toString() ?? '',
        floors: property.floors?.toString() ?? '',
        access_notes: property.access_notes ?? '',
        gate_code: property.gate_code ?? '',
        key_location: property.key_location ?? '',
        parking_instructions: property.parking_instructions ?? '',
        has_pets: property.has_pets ?? false,
        pet_details: property.pet_details ?? '',
        is_primary: property.is_primary,
      })
    } else if (!isEditing && open) {
      setAddress(null)
      setCoordinates(null)
      setShowManualForm(false)
      reset({
        property_type: '',
        square_feet: '',
        bedrooms: '',
        bathrooms: '',
        floors: '',
        access_notes: '',
        gate_code: '',
        key_location: '',
        parking_instructions: '',
        has_pets: false,
        pet_details: '',
        is_primary: false,
      })
    }
  }, [property, isEditing, open, reset])

  const handleAddressChange = (result: AddressResult | null) => {
    setAddress(result)
    if (result?.latitude && result?.longitude) {
      setCoordinates({ lat: result.latitude, lng: result.longitude })
    } else {
      setCoordinates(null)
    }
  }

  const handleManualAddressSubmit = (result: AddressResult) => {
    setAddress(result)
    setShowManualForm(false)
    // Manual entries don't have coordinates
    setCoordinates(null)
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setCoordinates({ lat, lng })
  }

  const onSubmit = async (data: PropertyFormValues) => {
    if (!address) {
      return
    }

    const geocodeConfidence: GeocodeConfidence = coordinates
      ? address.google_place_id
        ? 'high'
        : 'manual'
      : 'failed'

    const input: CreatePropertyInput = {
      customer_id: customerId,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country || 'US',
      property_type: data.property_type || undefined,
      square_feet: data.square_feet ? parseInt(data.square_feet) : undefined,
      bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
      bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : undefined,
      floors: data.floors ? parseInt(data.floors) : undefined,
      access_notes: data.access_notes || undefined,
      gate_code: data.gate_code || undefined,
      key_location: data.key_location || undefined,
      parking_instructions: data.parking_instructions || undefined,
      has_pets: data.has_pets,
      pet_details: data.has_pets ? data.pet_details || undefined : undefined,
      is_primary: data.is_primary,
      google_place_id: address.google_place_id,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
      geocode_confidence: geocodeConfidence,
    }

    if (isEditing && propertyId) {
      await updateMutation.mutateAsync({ id: propertyId, ...input })
    } else {
      await createMutation.mutateAsync(input)
    }

    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Property' : 'Add Property'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update property details.'
              : 'Add a new property for this customer.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing && isLoadingProperty ? (
          <div className="py-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 py-6 space-y-6 overflow-y-auto">
              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">
                  Address <span className="text-destructive">*</span>
                </h3>

                {showManualForm ? (
                  <ManualAddressForm
                    initialValue={address ?? undefined}
                    onSubmit={handleManualAddressSubmit}
                    onCancel={() => setShowManualForm(false)}
                  />
                ) : (
                  <>
                    <AddressAutocomplete
                      value={address}
                      onChange={handleAddressChange}
                      onManualEntry={() => setShowManualForm(true)}
                      disabled={isPending}
                    />

                    {coordinates && (
                      <MapPreview
                        latitude={coordinates.lat}
                        longitude={coordinates.lng}
                        onLocationChange={handleLocationChange}
                        allowPinAdjustment
                      />
                    )}
                  </>
                )}
              </div>

              <Separator />

              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Property Details</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property_type">Property Type</Label>
                    <Select
                      value={watchPropertyType}
                      onValueChange={(value) => setValue('property_type', value as PropertyType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="square_feet">Square Feet</Label>
                    <Input
                      id="square_feet"
                      type="number"
                      min="0"
                      placeholder="1500"
                      {...register('square_feet')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      placeholder="3"
                      {...register('bedrooms')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="2.5"
                      {...register('bathrooms')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="floors">Floors</Label>
                    <Input
                      id="floors"
                      type="number"
                      min="1"
                      placeholder="2"
                      {...register('floors')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Access Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Access Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gate_code">Gate Code</Label>
                    <Input
                      id="gate_code"
                      placeholder="1234"
                      {...register('gate_code')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key_location">Key Location</Label>
                    <Input
                      id="key_location"
                      placeholder="Under mat, lockbox #5678"
                      {...register('key_location')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parking_instructions">Parking Instructions</Label>
                  <Input
                    id="parking_instructions"
                    placeholder="Park in driveway, visitor spot B3"
                    {...register('parking_instructions')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="access_notes">Additional Access Notes</Label>
                  <Textarea
                    id="access_notes"
                    placeholder="Any other access instructions..."
                    rows={2}
                    {...register('access_notes')}
                  />
                </div>
              </div>

              <Separator />

              {/* Pets */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Pets</h3>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="has_pets"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register('has_pets')}
                  />
                  <Label htmlFor="has_pets" className="cursor-pointer">
                    This property has pets
                  </Label>
                </div>

                {watchHasPets && (
                  <div className="space-y-2">
                    <Label htmlFor="pet_details">Pet Details</Label>
                    <Textarea
                      id="pet_details"
                      placeholder="2 dogs (friendly), 1 cat. Dogs may be outside during cleaning."
                      rows={2}
                      {...register('pet_details')}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Options</h3>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_primary"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register('is_primary')}
                  />
                  <div>
                    <Label htmlFor="is_primary" className="cursor-pointer">
                      Set as primary property
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      The primary property is selected by default when creating bookings.
                    </p>
                  </div>
                </div>
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
              <Button type="submit" disabled={isPending || !address}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Property'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
