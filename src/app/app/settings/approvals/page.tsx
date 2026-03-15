'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  Info,
} from 'lucide-react'
import {
  useApprovalPolicies,
  useUpsertApprovalPolicy,
  useDeleteApprovalPolicy,
  type ApprovalTriggerType,
} from '@/features/policies/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'

const TRIGGER_OPTIONS: { value: ApprovalTriggerType; label: string; description: string; hasValue: boolean; valueLabel?: string }[] = [
  {
    value: 'discount_threshold',
    label: 'Discount Threshold',
    description: 'Require approval for discounts above a certain percentage',
    hasValue: true,
    valueLabel: 'Discount % threshold',
  },
  {
    value: 'booking_value_threshold',
    label: 'Booking Value Threshold',
    description: 'Require approval for bookings above a certain value',
    hasValue: true,
    valueLabel: 'Amount threshold ($)',
  },
  {
    value: 'refund_threshold',
    label: 'Refund Threshold',
    description: 'Require approval for refunds above a certain amount',
    hasValue: true,
    valueLabel: 'Amount threshold ($)',
  },
  {
    value: 'new_customer_large_job',
    label: 'New Customer Large Job',
    description: 'Require approval for large jobs from new customers',
    hasValue: true,
    valueLabel: 'Job value threshold ($)',
  },
  {
    value: 'manual_price_adjustment',
    label: 'Manual Price Adjustment',
    description: 'Require approval for any manual price adjustments',
    hasValue: false,
  },
  {
    value: 'custom_service',
    label: 'Custom Service',
    description: 'Require approval for custom or special service requests',
    hasValue: false,
  },
]

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
]

export default function ApprovalPoliciesPage() {
  const { data: policies, isLoading } = useApprovalPolicies()
  const upsertMutation = useUpsertApprovalPolicy()
  const deleteMutation = useDeleteApprovalPolicy()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newTriggerType, setNewTriggerType] = useState<ApprovalTriggerType>('discount_threshold')
  const [newTriggerValue, setNewTriggerValue] = useState('')
  const [newRequiresRole, setNewRequiresRole] = useState('manager')

  const selectedTrigger = TRIGGER_OPTIONS.find((t) => t.value === newTriggerType)

  const handleCreate = async () => {
    await upsertMutation.mutateAsync({
      triggerType: newTriggerType,
      triggerValue: selectedTrigger?.hasValue ? parseFloat(newTriggerValue) || undefined : undefined,
      requiresRole: newRequiresRole,
      isEnabled: true,
    })
    setShowNewForm(false)
    setNewTriggerType('discount_threshold')
    setNewTriggerValue('')
    setNewRequiresRole('manager')
  }

  const handleToggle = async (policyId: string, currentEnabled: boolean, triggerType: ApprovalTriggerType) => {
    await upsertMutation.mutateAsync({
      id: policyId,
      triggerType,
      isEnabled: !currentEnabled,
    })
  }

  const handleDelete = async (policyId: string) => {
    await deleteMutation.mutateAsync(policyId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Approval Policies"
        description="Configure when actions require manager or admin approval"
        actions={
          <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Policy
          </Button>
        }
      />

      <div className="space-y-6">
        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Approval policies help protect your business by requiring authorization for high-value or
            sensitive actions. When a policy is triggered, the action will be held pending until approved
            by someone with the required role.
          </AlertDescription>
        </Alert>

        {/* New Policy Form */}
        {showNewForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">New Approval Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newTriggerType}
                  onValueChange={(value) => setNewTriggerType(value as ApprovalTriggerType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTrigger && (
                  <p className="text-sm text-muted-foreground">{selectedTrigger.description}</p>
                )}
              </div>

              {selectedTrigger?.hasValue && (
                <div className="space-y-2">
                  <Label>{selectedTrigger.valueLabel}</Label>
                  <Input
                    type="number"
                    placeholder={selectedTrigger.value === 'discount_threshold' ? 'e.g., 15' : 'e.g., 500'}
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Required Role for Approval</Label>
                <Select value={newRequiresRole} onValueChange={setNewRequiresRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Users with this role or higher can approve these actions
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={upsertMutation.isPending || (selectedTrigger?.hasValue && !newTriggerValue)}
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Policy
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Active Approval Policies
            </CardTitle>
            <CardDescription>
              Actions matching these policies will require approval before completing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="space-y-3">
                {policies.map((policy) => {
                  const trigger = TRIGGER_OPTIONS.find((t) => t.value === policy.trigger_type)
                  const role = ROLE_OPTIONS.find((r) => r.value === policy.requires_role)
                  return (
                    <div
                      key={policy.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trigger?.label}</span>
                          {trigger?.hasValue && policy.trigger_value && (
                            <Badge variant="secondary">
                              {policy.trigger_type === 'discount_threshold'
                                ? `>${policy.trigger_value}%`
                                : `>$${policy.trigger_value}`}
                            </Badge>
                          )}
                          <Badge variant="outline">{role?.label} approval</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trigger?.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.is_enabled}
                            onCheckedChange={() =>
                              handleToggle(policy.id, policy.is_enabled, policy.trigger_type)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {policy.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this approval policy? This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(policy.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Approval Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add policies to require approval for high-value or sensitive actions.
                </p>
                <Button onClick={() => setShowNewForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Policy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
