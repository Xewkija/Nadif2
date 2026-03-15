'use client'

import { useState } from 'react'
import {
  Plus,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  ShieldCheck,
} from 'lucide-react'
import {
  usePaymentGatePolicies,
  useUpsertPaymentGatePolicy,
  useDeletePaymentGatePolicy,
  type PaymentGatePolicy,
} from '@/features/payments/hooks'
import { StripeConnectSection } from '@/features/payments/components'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const gateTypeLabels: Record<string, { label: string; description: string }> = {
  require_card_before_quote: {
    label: 'Card Before Quote',
    description: 'Require card on file before sending a quote',
  },
  require_card_before_confirm: {
    label: 'Card Before Confirm',
    description: 'Require card on file before confirming a booking',
  },
  require_deposit: {
    label: 'Require Deposit',
    description: 'Require a deposit payment before service',
  },
  require_prepayment: {
    label: 'Require Prepayment',
    description: 'Require full payment before service',
  },
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

type PolicyFormData = {
  name: string
  description: string
  gateType: string
  depositPercentage: string
  depositFlatCents: string
  minBookingAmountCents: string
  priority: string
  isActive: boolean
}

const INITIAL_FORM_DATA: PolicyFormData = {
  name: '',
  description: '',
  gateType: 'require_card_before_confirm',
  depositPercentage: '',
  depositFlatCents: '',
  minBookingAmountCents: '',
  priority: '0',
  isActive: true,
}

export default function PaymentSettingsPage() {
  const { data: policies, isLoading, error } = usePaymentGatePolicies()
  const upsertMutation = useUpsertPaymentGatePolicy()
  const deleteMutation = useDeletePaymentGatePolicy()

  const [editingPolicy, setEditingPolicy] = useState<PaymentGatePolicy | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [deleteDialogPolicy, setDeleteDialogPolicy] = useState<PaymentGatePolicy | null>(null)
  const [formData, setFormData] = useState<PolicyFormData>(INITIAL_FORM_DATA)

  const isPending = upsertMutation.isPending || deleteMutation.isPending

  const handleOpenSheet = (policy?: PaymentGatePolicy) => {
    if (policy) {
      setEditingPolicy(policy)
      setFormData({
        name: policy.name,
        description: policy.description ?? '',
        gateType: policy.gate_type,
        depositPercentage: policy.deposit_percentage?.toString() ?? '',
        depositFlatCents: policy.deposit_flat_cents?.toString() ?? '',
        minBookingAmountCents: policy.min_booking_amount_cents?.toString() ?? '',
        priority: policy.priority.toString(),
        isActive: policy.is_active,
      })
    } else {
      setEditingPolicy(null)
      setFormData(INITIAL_FORM_DATA)
    }
    setIsSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
    setEditingPolicy(null)
    setFormData(INITIAL_FORM_DATA)
  }

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      id: editingPolicy?.id,
      name: formData.name,
      description: formData.description || undefined,
      gateType: formData.gateType,
      depositPercentage: formData.depositPercentage ? parseInt(formData.depositPercentage) : null,
      depositFlatCents: formData.depositFlatCents ? parseInt(formData.depositFlatCents) : null,
      minBookingAmountCents: formData.minBookingAmountCents ? parseInt(formData.minBookingAmountCents) : null,
      priority: parseInt(formData.priority) || 0,
      isActive: formData.isActive,
    })
    handleCloseSheet()
  }

  const handleDelete = async () => {
    if (!deleteDialogPolicy) return
    await deleteMutation.mutateAsync(deleteDialogPolicy.id)
    setDeleteDialogPolicy(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load payment policies</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Payment Settings"
        description="Configure payment requirements and deposit policies"
        actions={
          <Button onClick={() => handleOpenSheet()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Button>
        }
      />

      {/* Stripe Connect */}
      <div className="mb-8">
        <StripeConnectSection />
      </div>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {policies?.filter(p => p.gate_type.includes('card') && p.is_active).length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Active card requirements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Deposit Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {policies?.filter(p => p.gate_type === 'require_deposit' && p.is_active).length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">Active deposit rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Total Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{policies?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">All payment policies</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : policies && policies.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{policy.name}</span>
                      {policy.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {policy.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {gateTypeLabels[policy.gate_type]?.label ?? policy.gate_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {policy.deposit_percentage && (
                      <span>{policy.deposit_percentage}%</span>
                    )}
                    {policy.deposit_flat_cents && (
                      <span>{formatCurrency(policy.deposit_flat_cents)}</span>
                    )}
                    {!policy.deposit_percentage && !policy.deposit_flat_cents && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.is_active ? 'success' : 'secondary'}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleOpenSheet(policy)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogPolicy(policy)}
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
          icon={CreditCard}
          title="No payment policies"
          description="Create payment policies to require cards or deposits for certain bookings."
          action={{
            label: 'Add Policy',
            onClick: () => handleOpenSheet(),
          }}
        />
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>
              {editingPolicy ? 'Edit Policy' : 'New Payment Policy'}
            </SheetTitle>
            <SheetDescription>
              Configure when payment requirements apply
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Policy Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Deposit for deep cleans"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When and why this policy applies"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gateType">Policy Type *</Label>
              <Select
                value={formData.gateType}
                onValueChange={(value) => setFormData({ ...formData, gateType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(gateTypeLabels).map(([value, { label, description }]) => (
                    <SelectItem key={value} value={value}>
                      <div>
                        <span>{label}</span>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formData.gateType === 'require_deposit' || formData.gateType === 'require_prepayment') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositPercentage">Deposit %</Label>
                    <div className="relative">
                      <Input
                        id="depositPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          depositPercentage: e.target.value,
                          depositFlatCents: '',
                        })}
                        placeholder="25"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositFlatCents">Or Flat Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="depositFlatCents"
                        type="number"
                        min="0"
                        value={formData.depositFlatCents ? (parseInt(formData.depositFlatCents) / 100).toString() : ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          depositFlatCents: e.target.value ? (parseFloat(e.target.value) * 100).toString() : '',
                          depositPercentage: '',
                        })}
                        placeholder="50.00"
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="minBookingAmount">Minimum Booking Amount</Label>
              <p className="text-sm text-muted-foreground">
                Only apply this policy to bookings above this amount
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="minBookingAmount"
                  type="number"
                  min="0"
                  value={formData.minBookingAmountCents ? (parseInt(formData.minBookingAmountCents) / 100).toString() : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    minBookingAmountCents: e.target.value ? (parseFloat(e.target.value) * 100).toString() : '',
                  })}
                  placeholder="0"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <p className="text-sm text-muted-foreground">
                Lower numbers are evaluated first
              </p>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable this policy
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={handleCloseSheet} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !formData.name || !formData.gateType}
            >
              {isPending ? 'Saving...' : editingPolicy ? 'Save Changes' : 'Create Policy'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogPolicy} onOpenChange={() => setDeleteDialogPolicy(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialogPolicy?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogPolicy(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
