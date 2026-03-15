'use client'

import { useState } from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  Info,
} from 'lucide-react'
import {
  useDeepCleanPolicies,
  useUpsertDeepCleanPolicy,
  useDeleteDeepCleanPolicy,
  type DeepCleanTriggerType,
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

const TRIGGER_OPTIONS: { value: DeepCleanTriggerType; label: string; description: string; hasValue: boolean }[] = [
  {
    value: 'days_since_last_deep',
    label: 'Days Since Last Deep Clean',
    description: 'Require deep clean if X days have passed since last deep clean',
    hasValue: true,
  },
  {
    value: 'cleanings_since_deep',
    label: 'Cleanings Since Deep Clean',
    description: 'Require deep clean after X regular cleanings',
    hasValue: true,
  },
  {
    value: 'new_customer',
    label: 'New Customer',
    description: 'Always require deep clean for new customers on first booking',
    hasValue: false,
  },
  {
    value: 'resume_after_pause',
    label: 'Resume After Pause',
    description: 'Require deep clean when resuming a paused recurring series',
    hasValue: false,
  },
  {
    value: 'property_change',
    label: 'Property Change',
    description: 'Require deep clean for new properties added to existing customers',
    hasValue: false,
  },
  {
    value: 'service_upgrade',
    label: 'Service Upgrade',
    description: 'Require deep clean when upgrading service level',
    hasValue: false,
  },
]

export default function DeepCleanPoliciesPage() {
  const { data: policies, isLoading } = useDeepCleanPolicies()
  const upsertMutation = useUpsertDeepCleanPolicy()
  const deleteMutation = useDeleteDeepCleanPolicy()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newTriggerType, setNewTriggerType] = useState<DeepCleanTriggerType>('days_since_last_deep')
  const [newTriggerValue, setNewTriggerValue] = useState('')

  const selectedTrigger = TRIGGER_OPTIONS.find((t) => t.value === newTriggerType)

  const handleCreate = async () => {
    await upsertMutation.mutateAsync({
      triggerType: newTriggerType,
      triggerValue: selectedTrigger?.hasValue ? parseInt(newTriggerValue) || undefined : undefined,
      isEnabled: true,
      priority: (policies?.length ?? 0) + 1,
    })
    setShowNewForm(false)
    setNewTriggerType('days_since_last_deep')
    setNewTriggerValue('')
  }

  const handleToggle = async (policyId: string, currentEnabled: boolean, triggerType: DeepCleanTriggerType) => {
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
        title="Deep Clean Policies"
        description="Define when deep cleaning is required before regular maintenance"
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
            Deep clean policies determine when customers must have a deep cleaning service before starting or
            resuming regular maintenance. Policies are evaluated in priority order and the first matching
            policy applies.
          </AlertDescription>
        </Alert>

        {/* New Policy Form */}
        {showNewForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">New Deep Clean Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newTriggerType}
                  onValueChange={(value) => setNewTriggerType(value as DeepCleanTriggerType)}
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
                  <Label>Threshold Value</Label>
                  <Input
                    type="number"
                    placeholder={newTriggerType === 'days_since_last_deep' ? 'e.g., 90' : 'e.g., 4'}
                    value={newTriggerValue}
                    onChange={(e) => setNewTriggerValue(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {newTriggerType === 'days_since_last_deep'
                      ? 'Number of days after which deep clean is required'
                      : 'Number of regular cleanings after which deep clean is required'}
                  </p>
                </div>
              )}

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
              <Sparkles className="h-5 w-5" />
              Active Policies
            </CardTitle>
            <CardDescription>
              Policies are evaluated in priority order. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="space-y-3">
                {policies.map((policy, index) => {
                  const trigger = TRIGGER_OPTIONS.find((t) => t.value === policy.trigger_type)
                  return (
                    <div
                      key={policy.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                    >
                      <div className="cursor-move text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{trigger?.label}</span>
                          {trigger?.hasValue && policy.trigger_value && (
                            <span className="text-sm text-muted-foreground">
                              ({policy.trigger_value} {policy.trigger_type === 'days_since_last_deep' ? 'days' : 'cleanings'})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {trigger?.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.is_enabled}
                            onCheckedChange={() => handleToggle(policy.id, policy.is_enabled, policy.trigger_type)}
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
                                Are you sure you want to delete this deep clean policy? This action cannot be undone.
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
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Deep Clean Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add policies to define when deep cleaning is required before regular maintenance.
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
