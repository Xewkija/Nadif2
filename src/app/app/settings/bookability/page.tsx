'use client'

import { useState } from 'react'
import {
  CalendarCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  Info,
  FileText,
  Zap,
  Settings2,
} from 'lucide-react'
import {
  useBookabilityPolicies,
  useUpsertBookabilityPolicy,
  useDeleteBookabilityPolicy,
  type BookabilityPolicyType,
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
import { Checkbox } from '@/components/ui/checkbox'

const POLICY_OPTIONS: { value: BookabilityPolicyType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'always_quote',
    label: 'Always Quote',
    description: 'All bookings require a quote to be sent and accepted before confirming',
    icon: FileText,
  },
  {
    value: 'always_instant',
    label: 'Always Instant Book',
    description: 'Customers can book instantly without requiring a quote',
    icon: Zap,
  },
  {
    value: 'conditional',
    label: 'Conditional',
    description: 'Quote or instant book based on service type or other conditions',
    icon: Settings2,
  },
]

const SERVICE_TYPES = [
  { value: 'standard', label: 'Standard Cleaning' },
  { value: 'deep', label: 'Deep Cleaning' },
  { value: 'move_in', label: 'Move-In Cleaning' },
  { value: 'move_out', label: 'Move-Out Cleaning' },
  { value: 'post_construction', label: 'Post-Construction' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'specialty', label: 'Specialty' },
]

export default function BookabilityPoliciesPage() {
  const { data: policies, isLoading } = useBookabilityPolicies()
  const upsertMutation = useUpsertBookabilityPolicy()
  const deleteMutation = useDeleteBookabilityPolicy()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newPolicyType, setNewPolicyType] = useState<BookabilityPolicyType>('always_instant')
  const [newServiceTypes, setNewServiceTypes] = useState<string[]>([])

  const selectedPolicy = POLICY_OPTIONS.find((p) => p.value === newPolicyType)

  const handleCreate = async () => {
    await upsertMutation.mutateAsync({
      policyType: newPolicyType,
      appliesToServiceTypes: newServiceTypes.length > 0 ? newServiceTypes : undefined,
      isEnabled: true,
    })
    setShowNewForm(false)
    setNewPolicyType('always_instant')
    setNewServiceTypes([])
  }

  const handleToggle = async (policyId: string, currentEnabled: boolean, policyType: BookabilityPolicyType) => {
    await upsertMutation.mutateAsync({
      id: policyId,
      policyType,
      isEnabled: !currentEnabled,
    })
  }

  const handleDelete = async (policyId: string) => {
    await deleteMutation.mutateAsync(policyId)
  }

  const toggleServiceType = (serviceType: string) => {
    setNewServiceTypes((prev) =>
      prev.includes(serviceType)
        ? prev.filter((t) => t !== serviceType)
        : [...prev, serviceType]
    )
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
        title="Bookability Policies"
        description="Configure when quotes are required vs instant booking"
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
            Bookability policies control whether customers can book services instantly or need to request
            a quote first. You can set policies globally or for specific service types.
          </AlertDescription>
        </Alert>

        {/* New Policy Form */}
        {showNewForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">New Bookability Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Policy Type</Label>
                <Select
                  value={newPolicyType}
                  onValueChange={(value) => setNewPolicyType(value as BookabilityPolicyType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_OPTIONS.map((policy) => (
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

              <div className="space-y-2">
                <Label>Apply to Service Types (optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Leave unchecked to apply to all service types
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`service-${type.value}`}
                        checked={newServiceTypes.includes(type.value)}
                        onCheckedChange={() => toggleServiceType(type.value)}
                      />
                      <Label htmlFor={`service-${type.value}`} className="text-sm font-normal">
                        {type.label}
                      </Label>
                    </div>
                  ))}
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
              <CalendarCheck className="h-5 w-5" />
              Active Policies
            </CardTitle>
            <CardDescription>
              Policies are evaluated in order. The first matching policy applies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="space-y-3">
                {policies.map((policy) => {
                  const policyInfo = POLICY_OPTIONS.find((p) => p.value === policy.policy_type)
                  const Icon = policyInfo?.icon ?? CalendarCheck
                  return (
                    <div
                      key={policy.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{policyInfo?.label}</span>
                          {policy.applies_to_service_types &&
                            policy.applies_to_service_types.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {policy.applies_to_service_types.map((type: string) => {
                                  const serviceType = SERVICE_TYPES.find((t) => t.value === type)
                                  return (
                                    <Badge key={type} variant="secondary" className="text-xs">
                                      {serviceType?.label ?? type}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                          {(!policy.applies_to_service_types ||
                            policy.applies_to_service_types.length === 0) && (
                            <Badge variant="outline" className="text-xs">
                              All services
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {policyInfo?.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.is_enabled}
                            onCheckedChange={() =>
                              handleToggle(policy.id, policy.is_enabled, policy.policy_type)
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
                                Are you sure you want to delete this bookability policy? This action
                                cannot be undone.
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
                <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bookability Policies</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add policies to control when quotes are required vs instant booking.
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
