'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Star,
  Building2,
  Loader2,
  MapPinned,
} from 'lucide-react'
import {
  useLocations,
  useUpsertLocation,
  useDeleteLocation,
  useCanDeleteLocation,
  type TenantLocation,
} from '@/features/locations/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
]

type FormData = {
  id?: string
  name: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  timezone: string
  phone: string
  email: string
  isPrimary: boolean
  isActive: boolean
}

const INITIAL_FORM: FormData = {
  name: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  timezone: 'America/New_York',
  phone: '',
  email: '',
  isPrimary: false,
  isActive: true,
}

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations()
  const upsertMutation = useUpsertLocation()
  const deleteMutation = useDeleteLocation()
  const canDeleteMutation = useCanDeleteLocation()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string; reason?: string }>({
    open: false,
    id: '',
    name: '',
  })

  const handleCreate = () => {
    setFormData(INITIAL_FORM)
    setSheetOpen(true)
  }

  const handleEdit = (location: TenantLocation) => {
    setFormData({
      id: location.id,
      name: location.name,
      addressLine1: location.address_line1 ?? '',
      addressLine2: location.address_line2 ?? '',
      city: location.city ?? '',
      state: location.state ?? '',
      postalCode: location.postal_code ?? '',
      country: location.country,
      timezone: location.timezone,
      phone: location.phone ?? '',
      email: location.email ?? '',
      isPrimary: location.is_primary,
      isActive: location.is_active,
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      id: formData.id,
      name: formData.name,
      addressLine1: formData.addressLine1 || undefined,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      postalCode: formData.postalCode || undefined,
      country: formData.country,
      timezone: formData.timezone,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      isPrimary: formData.isPrimary,
      isActive: formData.isActive,
    })
    setSheetOpen(false)
  }

  const handleDeleteClick = async (id: string, name: string) => {
    const result = await canDeleteMutation.mutateAsync(id)
    if (result.can_delete) {
      setDeleteDialog({ open: true, id, name })
    } else {
      setDeleteDialog({ open: true, id, name, reason: result.reason })
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.reason) {
      await deleteMutation.mutateAsync(deleteDialog.id)
    }
    setDeleteDialog({ open: false, id: '', name: '' })
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
        title="Locations"
        description="Manage your business locations and service areas"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        }
      />

      <div className="space-y-6">
        {locations && locations.length > 0 ? (
          <div className="grid gap-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{location.name}</h3>
                        {location.is_primary && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                        {!location.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {(location.address_line1 || location.city) && (
                        <p className="text-sm text-muted-foreground">
                          {[
                            location.address_line1,
                            location.city,
                            location.state,
                            location.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {location.phone && <span>{location.phone}</span>}
                        {location.email && <span>{location.email}</span>}
                        <span>
                          {TIMEZONES.find((tz) => tz.value === location.timezone)?.label ?? location.timezone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/app/settings/locations/${location.id}`}>
                          <MapPinned className="h-4 w-4 mr-2" />
                          Service Areas
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(location)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!location.is_primary && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(location.id, location.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Locations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first business location to start defining service areas.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Location
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Location Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{formData.id ? 'Edit Location' : 'New Location'}</SheetTitle>
            <SheetDescription>
              {formData.id
                ? 'Update the location details below.'
                : 'Add a new business location.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Office, Downtown Branch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                id="address1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input
                id="address2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                placeholder="Suite, unit, building, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g., CA"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label htmlFor="isPrimary">Primary Location</Label>
                <p className="text-sm text-muted-foreground">
                  Set as your main business location
                </p>
              </div>
              <Switch
                id="isPrimary"
                checked={formData.isPrimary}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive locations are not available for booking
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button
              onClick={handleSave}
              disabled={!formData.name || upsertMutation.isPending}
              className="flex-1"
            >
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {formData.id ? 'Save Changes' : 'Create Location'}
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.reason ? 'Cannot Delete Location' : 'Delete Location'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.reason ?? (
                <>
                  Are you sure you want to delete <strong>{deleteDialog.name}</strong>? This will
                  also delete all service areas for this location. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteDialog.reason && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
