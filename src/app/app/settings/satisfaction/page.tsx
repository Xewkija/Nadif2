'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCcw,
  Plus,
  Trash2,
  Save,
  Loader2,
  Info,
} from 'lucide-react'
import {
  useRecleanPolicies,
  useUpsertRecleanPolicy,
  useDeleteRecleanPolicy,
} from '@/features/policies/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Checkbox } from '@/components/ui/checkbox'

const CUSTOMER_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'vip', label: 'VIP' },
]

export default function SatisfactionPoliciesPage() {
  const { data: policies, isLoading } = useRecleanPolicies()
  const upsertMutation = useUpsertRecleanPolicy()
  const deleteMutation = useDeleteRecleanPolicy()

  const [showNewForm, setShowNewForm] = useState(false)
  const [formData, setFormData] = useState({
    eligibilityWindowHours: '48',
    maxRecleansPerBooking: '1',
    requiresApproval: true,
    autoApproveForRatingsBelow: '',
    autoApproveForCustomerTypes: [] as string[],
  })

  // For editing the default policy
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    eligibilityWindowHours: '',
    maxRecleansPerBooking: '',
    requiresApproval: true,
    autoApproveForRatingsBelow: '',
    autoApproveForCustomerTypes: [] as string[],
  })

  // Load existing policy into edit form
  useEffect(() => {
    if (editingPolicy && policies) {
      const policy = policies.find((p) => p.id === editingPolicy)
      if (policy) {
        setEditFormData({
          eligibilityWindowHours: policy.eligibility_window_hours.toString(),
          maxRecleansPerBooking: policy.max_recleans_per_booking.toString(),
          requiresApproval: policy.requires_approval,
          autoApproveForRatingsBelow: policy.auto_approve_for_ratings_below?.toString() ?? '',
          autoApproveForCustomerTypes: policy.auto_approve_for_customer_types ?? [],
        })
      }
    }
  }, [editingPolicy, policies])

  const handleCreate = async () => {
    await upsertMutation.mutateAsync({
      eligibilityWindowHours: parseInt(formData.eligibilityWindowHours) || 48,
      maxRecleansPerBooking: parseInt(formData.maxRecleansPerBooking) || 1,
      requiresApproval: formData.requiresApproval,
      autoApproveForRatingsBelow: formData.autoApproveForRatingsBelow
        ? parseInt(formData.autoApproveForRatingsBelow)
        : undefined,
      autoApproveForCustomerTypes:
        formData.autoApproveForCustomerTypes.length > 0
          ? formData.autoApproveForCustomerTypes
          : undefined,
      isEnabled: true,
    })
    setShowNewForm(false)
    setFormData({
      eligibilityWindowHours: '48',
      maxRecleansPerBooking: '1',
      requiresApproval: true,
      autoApproveForRatingsBelow: '',
      autoApproveForCustomerTypes: [],
    })
  }

  const handleUpdate = async (policyId: string) => {
    await upsertMutation.mutateAsync({
      id: policyId,
      eligibilityWindowHours: parseInt(editFormData.eligibilityWindowHours) || 48,
      maxRecleansPerBooking: parseInt(editFormData.maxRecleansPerBooking) || 1,
      requiresApproval: editFormData.requiresApproval,
      autoApproveForRatingsBelow: editFormData.autoApproveForRatingsBelow
        ? parseInt(editFormData.autoApproveForRatingsBelow)
        : undefined,
      autoApproveForCustomerTypes:
        editFormData.autoApproveForCustomerTypes.length > 0
          ? editFormData.autoApproveForCustomerTypes
          : undefined,
    })
    setEditingPolicy(null)
  }

  const handleToggle = async (policyId: string, currentEnabled: boolean) => {
    const policy = policies?.find((p) => p.id === policyId)
    if (!policy) return

    await upsertMutation.mutateAsync({
      id: policyId,
      isEnabled: !currentEnabled,
    })
  }

  const handleDelete = async (policyId: string) => {
    await deleteMutation.mutateAsync(policyId)
  }

  const toggleCustomerType = (
    type: string,
    current: string[],
    setter: (types: string[]) => void
  ) => {
    setter(
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
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
        title="Satisfaction & Reclean Policies"
        description="Configure reclean eligibility and approval rules"
        actions={
          policies && policies.length === 0 ? (
            <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          ) : null
        }
      />

      <div className="space-y-6">
        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Reclean policies define when customers can request a free reclean after service. These
            policies help balance customer satisfaction with operational costs. You can set
            auto-approval rules for certain ratings or customer types.
          </AlertDescription>
        </Alert>

        {/* New Policy Form */}
        {showNewForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg">Create Reclean Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Eligibility Window (hours)</Label>
                  <Input
                    type="number"
                    value={formData.eligibilityWindowHours}
                    onChange={(e) =>
                      setFormData({ ...formData, eligibilityWindowHours: e.target.value })
                    }
                    placeholder="48"
                  />
                  <p className="text-sm text-muted-foreground">
                    How long after service can a reclean be requested
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Recleans per Booking</Label>
                  <Input
                    type="number"
                    value={formData.maxRecleansPerBooking}
                    onChange={(e) =>
                      setFormData({ ...formData, maxRecleansPerBooking: e.target.value })
                    }
                    placeholder="1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of recleans allowed per booking
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="requires-approval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiresApproval: checked })
                  }
                />
                <div>
                  <Label htmlFor="requires-approval">Requires Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Reclean requests need staff approval before scheduling
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Auto-approve for Ratings Below (optional)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.autoApproveForRatingsBelow}
                  onChange={(e) =>
                    setFormData({ ...formData, autoApproveForRatingsBelow: e.target.value })
                  }
                  placeholder="e.g., 3"
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">
                  Automatically approve recleans for customers who rated below this
                </p>
              </div>

              <div className="space-y-2">
                <Label>Auto-approve for Customer Types (optional)</Label>
                <div className="flex gap-4 flex-wrap">
                  {CUSTOMER_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`new-${type.value}`}
                        checked={formData.autoApproveForCustomerTypes.includes(type.value)}
                        onCheckedChange={() =>
                          toggleCustomerType(
                            type.value,
                            formData.autoApproveForCustomerTypes,
                            (types) =>
                              setFormData({ ...formData, autoApproveForCustomerTypes: types })
                          )
                        }
                      />
                      <Label htmlFor={`new-${type.value}`} className="text-sm font-normal">
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
              <RefreshCcw className="h-5 w-5" />
              Reclean Policy
            </CardTitle>
            <CardDescription>
              Configure rules for when customers can request a complimentary reclean.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policies && policies.length > 0 ? (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id}>
                    {editingPolicy === policy.id ? (
                      // Edit form
                      <div className="space-y-6 p-4 border rounded-lg">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Eligibility Window (hours)</Label>
                            <Input
                              type="number"
                              value={editFormData.eligibilityWindowHours}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  eligibilityWindowHours: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Max Recleans per Booking</Label>
                            <Input
                              type="number"
                              value={editFormData.maxRecleansPerBooking}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  maxRecleansPerBooking: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Switch
                            checked={editFormData.requiresApproval}
                            onCheckedChange={(checked) =>
                              setEditFormData({ ...editFormData, requiresApproval: checked })
                            }
                          />
                          <Label>Requires Approval</Label>
                        </div>

                        <div className="space-y-2">
                          <Label>Auto-approve for Ratings Below</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={editFormData.autoApproveForRatingsBelow}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                autoApproveForRatingsBelow: e.target.value,
                              })
                            }
                            className="w-32"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Auto-approve for Customer Types</Label>
                          <div className="flex gap-4 flex-wrap">
                            {CUSTOMER_TYPES.map((type) => (
                              <div key={type.value} className="flex items-center gap-2">
                                <Checkbox
                                  id={`edit-${type.value}`}
                                  checked={editFormData.autoApproveForCustomerTypes.includes(
                                    type.value
                                  )}
                                  onCheckedChange={() =>
                                    toggleCustomerType(
                                      type.value,
                                      editFormData.autoApproveForCustomerTypes,
                                      (types) =>
                                        setEditFormData({
                                          ...editFormData,
                                          autoApproveForCustomerTypes: types,
                                        })
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`edit-${type.value}`}
                                  className="text-sm font-normal"
                                >
                                  {type.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdate(policy.id)}
                            disabled={upsertMutation.isPending}
                          >
                            {upsertMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditingPolicy(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                        <div className="flex-1 space-y-3">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Eligibility Window</p>
                              <p className="font-medium">{policy.eligibility_window_hours} hours</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Max Recleans</p>
                              <p className="font-medium">
                                {policy.max_recleans_per_booking} per booking
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Approval Required</p>
                              <p className="font-medium">
                                {policy.requires_approval ? 'Yes' : 'No'}
                              </p>
                            </div>
                            {policy.auto_approve_for_ratings_below && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Auto-approve for Ratings
                                </p>
                                <p className="font-medium">
                                  Below {policy.auto_approve_for_ratings_below} stars
                                </p>
                              </div>
                            )}
                          </div>
                          {policy.auto_approve_for_customer_types &&
                            policy.auto_approve_for_customer_types.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Auto-approve for Customer Types
                                </p>
                                <p className="font-medium">
                                  {policy.auto_approve_for_customer_types
                                    .map((t: string) => CUSTOMER_TYPES.find((ct) => ct.value === t)?.label ?? t)
                                    .join(', ')}
                                </p>
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={policy.is_enabled}
                              onCheckedChange={() => handleToggle(policy.id, policy.is_enabled)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {policy.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setEditingPolicy(policy.id)}>
                            Edit
                          </Button>
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
                                  Are you sure you want to delete this reclean policy? This action
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
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Reclean Policy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a policy to define when customers can request complimentary recleans.
                </p>
                <Button onClick={() => setShowNewForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Policy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
