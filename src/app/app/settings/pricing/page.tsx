'use client'

import { useState } from 'react'
import { Plus, DollarSign, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react'
import { usePricingRules, useDeletePricingRule, useUpdatePricingRule } from '@/features/pricing/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PricingRuleSheet } from './components/pricing-rule-sheet'
import type { PricingRuleCategory, PricingRuleTrigger } from '@/types/database'

const categoryLabels: Record<PricingRuleCategory, string> = {
  property_modifier: 'Property',
  service_modifier: 'Service',
  location_modifier: 'Location',
  schedule_modifier: 'Schedule',
  lead_time_modifier: 'Lead Time',
  frequency_discount: 'Frequency',
  customer_discount: 'Customer',
  promotional: 'Promotion',
  referral: 'Referral',
  loyalty: 'Loyalty',
  manual_adjustment: 'Manual',
  fee: 'Fee',
  tax: 'Tax',
}

const categoryColors: Record<PricingRuleCategory, string> = {
  property_modifier: 'bg-blue-100 text-blue-800',
  service_modifier: 'bg-purple-100 text-purple-800',
  location_modifier: 'bg-green-100 text-green-800',
  schedule_modifier: 'bg-orange-100 text-orange-800',
  lead_time_modifier: 'bg-yellow-100 text-yellow-800',
  frequency_discount: 'bg-teal-100 text-teal-800',
  customer_discount: 'bg-pink-100 text-pink-800',
  promotional: 'bg-red-100 text-red-800',
  referral: 'bg-indigo-100 text-indigo-800',
  loyalty: 'bg-amber-100 text-amber-800',
  manual_adjustment: 'bg-slate-100 text-slate-800',
  fee: 'bg-rose-100 text-rose-800',
  tax: 'bg-gray-100 text-gray-800',
}

const triggerLabels: Record<PricingRuleTrigger, string> = {
  always: 'Always',
  property_sqft: 'Square Footage',
  property_beds: 'Bedrooms',
  property_baths: 'Bathrooms',
  property_type: 'Property Type',
  day_of_week: 'Day of Week',
  holiday: 'Holiday',
  time_of_day: 'Time of Day',
  lead_time_days: 'Lead Time',
  frequency: 'Frequency',
  customer_type: 'Customer Type',
  promo_code: 'Promo Code',
  manual: 'Manual',
}

function formatAdjustment(type: string, value: number): string {
  if (type === 'percentage') {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value}%`
  }
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${Math.abs(value / 100).toFixed(2)}`
}

export default function PricingRulesPage() {
  const { data: rules, isLoading, error } = usePricingRules()
  const deleteMutation = useDeletePricingRule()
  const updateMutation = useUpdatePricingRule()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  const handleNewRule = () => {
    setEditingRuleId(null)
    setSheetOpen(true)
  }

  const handleEditRule = (ruleId: string) => {
    setEditingRuleId(ruleId)
    setSheetOpen(true)
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this pricing rule? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(ruleId)
    }
  }

  const handleToggleActive = async (ruleId: string, currentlyActive: boolean) => {
    await updateMutation.mutateAsync({
      id: ruleId,
      is_active: !currentlyActive,
    })
  }

  const handleSheetClose = () => {
    setSheetOpen(false)
    setEditingRuleId(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load pricing rules</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pricing Rules"
        description="Configure automatic pricing adjustments, discounts, and fees"
        actions={
          <Button onClick={handleNewRule}>
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : rules && rules.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Rule</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Adjustment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.name}</span>
                      {rule.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {rule.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={categoryColors[rule.category]}
                    >
                      {categoryLabels[rule.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {triggerLabels[rule.trigger_type]}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono font-medium ${
                        rule.adjustment_value >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatAdjustment(rule.adjustment_type, rule.adjustment_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(rule.id, rule.is_active)}
                      className="inline-flex items-center"
                      disabled={updateMutation.isPending}
                    >
                      {rule.is_active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200">
                          <Check className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200">
                          <X className="mr-1 h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRule(rule.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={DollarSign}
          title="No pricing rules yet"
          description="Create pricing rules to automatically adjust prices based on property size, service type, scheduling, discounts, and more."
          action={{
            label: 'Create Rule',
            onClick: handleNewRule,
          }}
        />
      )}

      <PricingRuleSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        ruleId={editingRuleId}
      />
    </div>
  )
}
