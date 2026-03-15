'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  type CreateCustomerInput,
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
import type { CustomerType } from '@/types/database'

interface CustomerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string | null
  redirectOnCreate?: boolean
}

type CustomerFormValues = {
  first_name: string
  last_name: string
  email: string
  phone: string
  phone_secondary: string
  customer_type: CustomerType
  preferred_contact_method: 'email' | 'phone' | 'sms' | ''
  notes: string
  internal_notes: string
}

const customerTypeOptions: { value: CustomerType; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'repeat', label: 'Repeat Customer' },
  { value: 'vip', label: 'VIP' },
]

const contactMethodOptions = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'sms', label: 'Text Message' },
]

export function CustomerSheet({
  open,
  onOpenChange,
  customerId,
  redirectOnCreate = true,
}: CustomerSheetProps) {
  const router = useRouter()
  const isEditing = !!customerId
  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(customerId ?? undefined)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      phone_secondary: '',
      customer_type: 'lead',
      preferred_contact_method: '',
      notes: '',
      internal_notes: '',
    },
  })

  const watchCustomerType = watch('customer_type')
  const watchPreferredContact = watch('preferred_contact_method')

  useEffect(() => {
    if (isEditing && customer) {
      reset({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        phone_secondary: customer.phone_secondary ?? '',
        customer_type: customer.customer_type,
        preferred_contact_method: (customer.preferred_contact_method as CustomerFormValues['preferred_contact_method']) ?? '',
        notes: customer.notes ?? '',
        internal_notes: customer.internal_notes ?? '',
      })
    } else if (!isEditing && open) {
      reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        phone_secondary: '',
        customer_type: 'lead',
        preferred_contact_method: '',
        notes: '',
        internal_notes: '',
      })
    }
  }, [customer, isEditing, open, reset])

  const onSubmit = async (data: CustomerFormValues) => {
    const input: CreateCustomerInput = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      phone_secondary: data.phone_secondary || undefined,
      customer_type: data.customer_type,
      preferred_contact_method: data.preferred_contact_method || undefined,
      notes: data.notes || undefined,
      internal_notes: data.internal_notes || undefined,
    }

    if (isEditing && customerId) {
      await updateMutation.mutateAsync({ id: customerId, ...input })
      onOpenChange(false)
    } else {
      const newCustomer = await createMutation.mutateAsync(input)
      onOpenChange(false)
      if (redirectOnCreate) {
        router.push(`/app/customers/${newCustomer.id}`)
      }
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Customer' : 'New Customer'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update customer information.'
              : 'Add a new customer to your database.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing && isLoadingCustomer ? (
          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 py-6 space-y-6 overflow-y-auto">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    {...register('first_name', { required: 'First name is required' })}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="Smith"
                    {...register('last_name', { required: 'Last name is required' })}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Contact Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register('email', {
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...register('phone')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_secondary">Secondary Phone</Label>
                    <Input
                      id="phone_secondary"
                      type="tel"
                      placeholder="(555) 987-6543"
                      {...register('phone_secondary')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_contact">Preferred Contact Method</Label>
                  <Select
                    value={watchPreferredContact}
                    onValueChange={(value) =>
                      setValue('preferred_contact_method', value as CustomerFormValues['preferred_contact_method'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No preference</SelectItem>
                      {contactMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Classification</h3>

                <div className="space-y-2">
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Select
                    value={watchCustomerType}
                    onValueChange={(value) => setValue('customer_type', value as CustomerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Notes</h3>

                <div className="space-y-2">
                  <Label htmlFor="notes">Customer Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes visible to all staff..."
                    rows={2}
                    {...register('notes')}
                  />
                  <p className="text-xs text-muted-foreground">
                    General notes about the customer, visible to staff.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    placeholder="Private notes for management..."
                    rows={2}
                    {...register('internal_notes')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Private notes, only visible to managers and admins.
                  </p>
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Customer'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
