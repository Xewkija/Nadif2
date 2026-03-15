'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
  usePricingRule,
  useCreatePricingRule,
  useUpdatePricingRule,
  type CreatePricingRuleInput,
} from '@/features/pricing/hooks'
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
import type { PricingRuleCategory, PricingRuleTrigger } from '@/types/database'

interface PricingRuleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ruleId: string | null
}

type RuleFormValues = {
  name: string
  description: string
  category: PricingRuleCategory
  trigger_type: PricingRuleTrigger
  adjustment_type: 'percentage' | 'fixed'
  adjustment_value: number
  priority: number
  is_stackable: boolean
}

const categoryOptions: { value: PricingRuleCategory; label: string; description: string }[] = [
  { value: 'property_modifier', label: 'Property Modifier', description: 'Based on property attributes' },
  { value: 'service_modifier', label: 'Service Modifier', description: 'Based on service type' },
  { value: 'location_modifier', label: 'Location Modifier', description: 'Based on service area' },
  { value: 'schedule_modifier', label: 'Schedule Modifier', description: 'Based on date/time' },
  { value: 'lead_time_modifier', label: 'Lead Time Modifier', description: 'Based on booking lead time' },
  { value: 'frequency_discount', label: 'Frequency Discount', description: 'Discount for recurring' },
  { value: 'customer_discount', label: 'Customer Discount', description: 'Based on customer type' },
  { value: 'promotional', label: 'Promotional', description: 'Limited-time offers' },
  { value: 'fee', label: 'Fee', description: 'Additional charges' },
  { value: 'tax', label: 'Tax', description: 'Tax calculations' },
]

const triggerOptions: { value: PricingRuleTrigger; label: string }[] = [
  { value: 'always', label: 'Always Apply' },
  { value: 'property_sqft', label: 'Square Footage Range' },
  { value: 'property_beds', label: 'Number of Bedrooms' },
  { value: 'property_baths', label: 'Number of Bathrooms' },
  { value: 'property_type', label: 'Property Type' },
  { value: 'day_of_week', label: 'Day of Week' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'time_of_day', label: 'Time of Day' },
  { value: 'lead_time_days', label: 'Lead Time (Days)' },
  { value: 'frequency', label: 'Booking Frequency' },
  { value: 'customer_type', label: 'Customer Type' },
  { value: 'promo_code', label: 'Promo Code' },
  { value: 'manual', label: 'Manual Application' },
]

export function PricingRuleSheet({ open, onOpenChange, ruleId }: PricingRuleSheetProps) {
  const isEditing = !!ruleId
  const { data: rule, isLoading: isLoadingRule } = usePricingRule(ruleId ?? undefined)
  const createMutation = useCreatePricingRule()
  const updateMutation = useUpdatePricingRule()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RuleFormValues>({
    defaultValues: {
      name: '',
      description: '',
      category: 'property_modifier',
      trigger_type: 'always',
      adjustment_type: 'percentage',
      adjustment_value: 0,
      priority: 100,
      is_stackable: true,
    },
  })

  const watchCategory = watch('category')
  const watchTriggerType = watch('trigger_type')
  const watchAdjustmentType = watch('adjustment_type')

  useEffect(() => {
    if (isEditing && rule) {
      reset({
        name: rule.name,
        description: rule.description ?? '',
        category: rule.category,
        trigger_type: rule.trigger_type,
        adjustment_type: rule.adjustment_type as 'percentage' | 'fixed',
        adjustment_value:
          rule.adjustment_type === 'fixed'
            ? rule.adjustment_value / 100 // Convert cents to dollars
            : rule.adjustment_value,
        priority: rule.priority,
        is_stackable: rule.is_stackable,
      })
    } else if (!isEditing && open) {
      reset({
        name: '',
        description: '',
        category: 'property_modifier',
        trigger_type: 'always',
        adjustment_type: 'percentage',
        adjustment_value: 0,
        priority: 100,
        is_stackable: true,
      })
    }
  }, [rule, isEditing, open, reset])

  const onSubmit = async (data: RuleFormValues) => {
    const input: CreatePricingRuleInput = {
      name: data.name,
      description: data.description || undefined,
      category: data.category,
      trigger_type: data.trigger_type,
      adjustment_type: data.adjustment_type,
      adjustment_value:
        data.adjustment_type === 'fixed'
          ? Math.round(data.adjustment_value * 100) // Convert to cents
          : data.adjustment_value,
      priority: data.priority,
      is_stackable: data.is_stackable,
    }

    if (isEditing && ruleId) {
      await updateMutation.mutateAsync({ id: ruleId, ...input })
    } else {
      await createMutation.mutateAsync(input)
    }

    onOpenChange(false)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>{isEditing ? 'Edit Pricing Rule' : 'New Pricing Rule'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the pricing rule configuration.'
              : 'Create a rule to automatically adjust prices.'}
          </SheetDescription>
        </SheetHeader>

        {isEditing && isLoadingRule ? (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="flex-1 py-6 space-y-6 overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Rule Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Weekend Premium"
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
                    placeholder="When and why this rule applies..."
                    rows={2}
                    {...register('description')}
                  />
                </div>
              </div>

              <Separator />

              {/* Category & Trigger */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">When to Apply</h3>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={watchCategory}
                    onValueChange={(value) => setValue('category', value as PricingRuleCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trigger_type">Trigger Condition</Label>
                  <Select
                    value={watchTriggerType}
                    onValueChange={(value) => setValue('trigger_type', value as PricingRuleTrigger)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Additional trigger conditions can be configured after creation.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Adjustment */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Price Adjustment</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adjustment_type">Adjustment Type</Label>
                    <Select
                      value={watchAdjustmentType}
                      onValueChange={(value) =>
                        setValue('adjustment_type', value as 'percentage' | 'fixed')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adjustment_value">
                      {watchAdjustmentType === 'percentage' ? 'Percentage' : 'Amount ($)'}
                    </Label>
                    <Input
                      id="adjustment_value"
                      type="number"
                      step={watchAdjustmentType === 'percentage' ? '1' : '0.01'}
                      placeholder={watchAdjustmentType === 'percentage' ? '10' : '25.00'}
                      {...register('adjustment_value', {
                        required: 'Value is required',
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use negative values for discounts, positive for surcharges.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Advanced */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Advanced Options</h3>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="1000"
                    {...register('priority')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers are applied first. Default is 100.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_stackable"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register('is_stackable')}
                  />
                  <div>
                    <Label htmlFor="is_stackable" className="cursor-pointer">
                      Stackable
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Can combine with other rules of the same category
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Rule'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
