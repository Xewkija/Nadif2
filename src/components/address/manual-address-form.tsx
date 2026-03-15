'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AddressResult } from './address-autocomplete'

interface ManualAddressFormProps {
  initialValue?: Partial<AddressResult>
  onSubmit: (address: AddressResult) => void
  onCancel: () => void
}

type FormValues = {
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]

export function ManualAddressForm({
  initialValue,
  onSubmit,
  onCancel,
}: ManualAddressFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      address_line1: initialValue?.address_line1 ?? '',
      address_line2: initialValue?.address_line2 ?? '',
      city: initialValue?.city ?? '',
      state: initialValue?.state ?? '',
      postal_code: initialValue?.postal_code ?? '',
    },
  })

  const watchState = watch('state')

  const handleFormSubmit = (data: FormValues) => {
    const formatted = [
      data.address_line1,
      data.address_line2,
      `${data.city}, ${data.state} ${data.postal_code}`,
    ]
      .filter(Boolean)
      .join(', ')

    onSubmit({
      address_line1: data.address_line1,
      address_line2: data.address_line2 || undefined,
      city: data.city,
      state: data.state,
      postal_code: data.postal_code,
      country: 'US',
      formatted_address: formatted,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address_line1">
          Street Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="address_line1"
          placeholder="123 Main St"
          {...register('address_line1', { required: 'Street address is required' })}
        />
        {errors.address_line1 && (
          <p className="text-sm text-destructive">{errors.address_line1.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line2">Apt, Suite, Unit (optional)</Label>
        <Input
          id="address_line2"
          placeholder="Apt 4B"
          {...register('address_line2')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input
            id="city"
            placeholder="San Francisco"
            {...register('city', { required: 'City is required' })}
          />
          {errors.city && (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">
            State <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watchState}
            onValueChange={(value) => setValue('state', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && (
            <p className="text-sm text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postal_code">
          ZIP Code <span className="text-destructive">*</span>
        </Label>
        <Input
          id="postal_code"
          placeholder="94102"
          maxLength={10}
          {...register('postal_code', {
            required: 'ZIP code is required',
            pattern: {
              value: /^\d{5}(-\d{4})?$/,
              message: 'Enter a valid ZIP code',
            },
          })}
          className="w-32"
        />
        {errors.postal_code && (
          <p className="text-sm text-destructive">{errors.postal_code.message}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Use This Address</Button>
      </div>
    </form>
  )
}
