'use client'

import { useState } from 'react'
import {
  KeyRound,
  Plus,
  Trash2,
  Save,
  Loader2,
  Info,
  Lock,
  Key,
  Dog,
  Car,
  AlertTriangle,
} from 'lucide-react'
import {
  useAccessPolicies,
  useUpsertAccessPolicy,
  useDeleteAccessPolicy,
  type AccessPolicyType,
} from '@/features/policies/hooks'
import { Button } from '@/components/ui/button'
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

const POLICY_OPTIONS: { value: AccessPolicyType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'require_access_code',
    label: 'Access Code',
    description: 'Require property access code before scheduling',
    icon: Lock,
  },
  {
    value: 'require_key_on_file',
    label: 'Key on File',
    description: 'Require confirmation that key is on file',
    icon: Key,
  },
  {
    value: 'require_lockbox_code',
    label: 'Lockbox Code',
    description: 'Require lockbox code for property entry',
    icon: KeyRound,
  },
  {
    value: 'require_alarm_code',
    label: 'Alarm Code',
    description: 'Require alarm code before service',
    icon: AlertTriangle,
  },
  {
    value: 'require_pet_instructions',
    label: 'Pet Instructions',
    description: 'Require pet handling instructions if pets present',
    icon: Dog,
  },
  {
    value: 'require_parking_instructions',
    label: 'Parking Instructions',
    description: 'Require parking instructions for the property',
    icon: Car,
  },
]

export default function AccessPoliciesPage() {
  const { data: policies, isLoading } = useAccessPolicies()
  const upsertMutation = useUpsertAccessPolicy()
  const deleteMutation = useDeleteAccessPolicy()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newPolicyType, setNewPolicyType] = useState<AccessPolicyType>('require_access_code')
  const [newWarningOnly, setNewWarningOnly] = useState(false)

  const selectedPolicy = POLICY_OPTIONS.find((p) => p.value === newPolicyType)

  const handleCreate = async () => {
    await upsertMutation.mutateAsync({
      policyType: newPolicyType,
      isRequired: true,
      warningOnly: newWarningOnly,
    })
    setShowNewForm(false)
    setNewPolicyType('require_access_code')
    setNewWarningOnly(false)
  }

  const handleToggle = async (policyId: string, currentRequired: boolean, policyType: AccessPolicyType) => {
    await upsertMutation.mutateAsync({
      id: policyId,
      policyType,
      isRequired: !currentRequired,
    })
  }

  const handleToggleWarning = async (policyId: string, currentWarningOnly: boolean, policyType: AccessPolicyType) => {
    await upsertMutation.mutateAsync({
      id: policyId,
      policyType,
      warningOnly: !currentWarningOnly,
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

  // Get existing policy types to filter available options
  const existingTypes = new Set(policies?.map((p) => p.policy_type) ?? [])
  const availableOptions = POLICY_OPTIONS.filter((p) => !existingTypes.has(p.value))

  return (
    <div>
      <PageHeader
        title="Access Policies"
        description="Configure required property access information before scheduling"
        actions={
          availableOptions.length > 0 && (
            <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Access policies ensure that essential property information is collected before service. Required
            policies will block scheduling until information is provided. Warning-only policies will show a
            reminder but allow scheduling to proceed.
          </AlertDescription>
        </Alert>

        {/* New Policy Form */}
        {showNewForm && availableOptions.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">New Access Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Policy Type</Label>
                <Select
                  value={newPolicyType}
                  onValueChange={(value) => setNewPolicyType(value as AccessPolicyType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((policy) => (
                      <SelectItem key={policy.value} value={policy.value}>
                        <div className="flex items-center gap-2">
                          <policy.icon className="h-4 w-4" />
                          {policy.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPolicy && (
                  <p className="text-sm text-muted-foreground">{selectedPolicy.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="warning-only"
                  checked={newWarningOnly}
                  onCheckedChange={setNewWarningOnly}
                />
                <div>
                  <Label htmlFor="warning-only">Warning only</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a reminder but don&apos;t block scheduling
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={upsertMutation.isPending}>
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
              <KeyRound className="h-5 w-5" />
              Access Requirements
            </CardTitle>
            <CardDescription>
              Information required from customers before service can be scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="space-y-3">
                {policies.map((policy) => {
                  const policyInfo = POLICY_OPTIONS.find((p) => p.value === policy.policy_type)
                  const Icon = policyInfo?.icon ?? KeyRound
                  return (
                    <div
                      key={policy.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{policyInfo?.label}</span>
                          {policy.warning_only ? (
                            <Badge variant="secondary">Warning Only</Badge>
                          ) : (
                            <Badge>Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {policyInfo?.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.is_required}
                            onCheckedChange={() =>
                              handleToggle(policy.id, policy.is_required, policy.policy_type)
                            }
                          />
                          <span className="text-sm text-muted-foreground">Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.warning_only}
                            onCheckedChange={() =>
                              handleToggleWarning(policy.id, policy.warning_only, policy.policy_type)
                            }
                          />
                          <span className="text-sm text-muted-foreground">Warn</span>
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
                                Are you sure you want to delete this access policy? This action cannot be
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
                <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Access Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add policies to require property access information before scheduling service.
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
