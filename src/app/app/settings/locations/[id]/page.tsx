'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Circle,
  Hexagon,
  Hash,
  Info,
  GripVertical,
} from 'lucide-react'
import {
  useLocation,
  useServiceAreas,
  useUpsertServiceArea,
  useDeleteServiceArea,
  type ServiceArea,
  type ServiceAreaType,
  type SurchargeType,
} from '@/features/locations/hooks'
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
import { Textarea } from '@/components/ui/textarea'

const AREA_TYPES: { value: ServiceAreaType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'radius',
    label: 'Radius',
    description: 'Define coverage by distance from a center point',
    icon: Circle,
  },
  {
    value: 'zip_codes',
    label: 'ZIP Codes',
    description: 'Define coverage by specific ZIP codes',
    icon: Hash,
  },
  {
    value: 'polygon',
    label: 'Polygon',
    description: 'Draw a custom boundary (advanced)',
    icon: Hexagon,
  },
]

const SURCHARGE_TYPES: { value: SurchargeType; label: string }[] = [
  { value: 'flat', label: 'Flat Amount' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'per_mile', label: 'Per Mile' },
]

type FormData = {
  id?: string
  name: string
  areaType: ServiceAreaType
  centerLatitude: string
  centerLongitude: string
  radiusMiles: string
  zipCodes: string
  priority: string
  surchargeType: SurchargeType | ''
  surchargeValue: string
  isActive: boolean
}

const INITIAL_FORM: FormData = {
  name: '',
  areaType: 'radius',
  centerLatitude: '',
  centerLongitude: '',
  radiusMiles: '25',
  zipCodes: '',
  priority: '0',
  surchargeType: '',
  surchargeValue: '',
  isActive: true,
}

export default function LocationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.id as string

  const { data: location, isLoading: locationLoading } = useLocation(locationId)
  const { data: serviceAreas, isLoading: areasLoading } = useServiceAreas(locationId)
  const upsertMutation = useUpsertServiceArea()
  const deleteMutation = useDeleteServiceArea()

  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)

  const handleCreate = () => {
    // Use location coordinates as default center if available
    setFormData({
      ...INITIAL_FORM,
      centerLatitude: location?.latitude?.toString() ?? '',
      centerLongitude: location?.longitude?.toString() ?? '',
    })
    setShowNewForm(true)
    setEditingId(null)
  }

  const handleEdit = (area: ServiceArea) => {
    setFormData({
      id: area.id,
      name: area.name,
      areaType: area.area_type,
      centerLatitude: area.center_latitude?.toString() ?? '',
      centerLongitude: area.center_longitude?.toString() ?? '',
      radiusMiles: area.radius_miles?.toString() ?? '25',
      zipCodes: area.zip_codes?.join(', ') ?? '',
      priority: area.priority.toString(),
      surchargeType: area.surcharge_type ?? '',
      surchargeValue: area.surcharge_value?.toString() ?? '',
      isActive: area.is_active,
    })
    setEditingId(area.id)
    setShowNewForm(false)
  }

  const handleCancel = () => {
    setShowNewForm(false)
    setEditingId(null)
    setFormData(INITIAL_FORM)
  }

  const handleSave = async () => {
    const zipCodesArray = formData.zipCodes
      ? formData.zipCodes.split(',').map((z) => z.trim()).filter(Boolean)
      : undefined

    await upsertMutation.mutateAsync({
      id: formData.id,
      locationId,
      name: formData.name,
      areaType: formData.areaType,
      centerLatitude: formData.centerLatitude ? parseFloat(formData.centerLatitude) : undefined,
      centerLongitude: formData.centerLongitude ? parseFloat(formData.centerLongitude) : undefined,
      radiusMiles: formData.radiusMiles ? parseFloat(formData.radiusMiles) : undefined,
      zipCodes: zipCodesArray,
      priority: parseInt(formData.priority) || 0,
      surchargeType: formData.surchargeType || undefined,
      surchargeValue: formData.surchargeValue ? parseFloat(formData.surchargeValue) : undefined,
      isActive: formData.isActive,
    })

    handleCancel()
  }

  const handleDelete = async (areaId: string) => {
    await deleteMutation.mutateAsync(areaId)
  }

  const handleToggle = async (area: ServiceArea) => {
    await upsertMutation.mutateAsync({
      id: area.id,
      locationId: area.location_id,
      name: area.name,
      areaType: area.area_type,
      isActive: !area.is_active,
    })
  }

  if (locationLoading || areasLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="text-center py-16">
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Location Not Found</h3>
        <Button variant="outline" asChild>
          <Link href="/app/settings/locations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Link>
        </Button>
      </div>
    )
  }

  const renderForm = (isNew: boolean) => (
    <Card className={isNew ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="text-lg">
          {isNew ? 'New Service Area' : 'Edit Service Area'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Area Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Downtown, Suburbs, Extended"
          />
        </div>

        <div className="space-y-2">
          <Label>Area Type</Label>
          <Select
            value={formData.areaType}
            onValueChange={(value) => setFormData({ ...formData, areaType: value as ServiceAreaType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AREA_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {AREA_TYPES.find((t) => t.value === formData.areaType)?.description}
          </p>
        </div>

        {formData.areaType === 'radius' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Center Latitude *</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={formData.centerLatitude}
                  onChange={(e) => setFormData({ ...formData, centerLatitude: e.target.value })}
                  placeholder="e.g., 37.7749"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Center Longitude *</Label>
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={formData.centerLongitude}
                  onChange={(e) => setFormData({ ...formData, centerLongitude: e.target.value })}
                  placeholder="e.g., -122.4194"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (miles) *</Label>
              <Input
                id="radius"
                type="number"
                step="0.1"
                value={formData.radiusMiles}
                onChange={(e) => setFormData({ ...formData, radiusMiles: e.target.value })}
                placeholder="e.g., 25"
                className="w-32"
              />
            </div>
          </>
        )}

        {formData.areaType === 'zip_codes' && (
          <div className="space-y-2">
            <Label htmlFor="zipCodes">ZIP Codes *</Label>
            <Textarea
              id="zipCodes"
              value={formData.zipCodes}
              onChange={(e) => setFormData({ ...formData, zipCodes: e.target.value })}
              placeholder="Enter ZIP codes separated by commas, e.g., 94102, 94103, 94104"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Separate multiple ZIP codes with commas
            </p>
          </div>
        )}

        {formData.areaType === 'polygon' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Polygon-based service areas require map integration. For now, use radius or ZIP code
              areas. Polygon support coming soon.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            placeholder="0"
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            Lower numbers = higher priority. When areas overlap, lower priority is used.
          </p>
        </div>

        <div className="border-t pt-4">
          <Label className="mb-3 block">Surcharge (optional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Select
                value={formData.surchargeType}
                onValueChange={(value) =>
                  setFormData({ ...formData, surchargeType: value as SurchargeType | '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No surcharge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No surcharge</SelectItem>
                  {SURCHARGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.surchargeType && (
              <div className="space-y-2">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.surchargeValue}
                  onChange={(e) => setFormData({ ...formData, surchargeValue: e.target.value })}
                  placeholder={formData.surchargeType === 'percentage' ? '10' : '25.00'}
                />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Add an extra fee for properties in this area
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <Label htmlFor="isActive">Active</Label>
            <p className="text-sm text-muted-foreground">
              Inactive areas are not used for location resolution
            </p>
          </div>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!formData.name || upsertMutation.isPending}
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isNew ? 'Create Area' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/app/settings/locations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Service Areas for ${location.name}`}
        description="Define the geographic areas this location serves"
        actions={
          !showNewForm && !editingId && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service Area
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Service areas determine which location serves a property based on its address. When a
            property is added, the system checks which service area contains it and assigns the
            corresponding location. If no area matches, the property is marked as out of service
            area.
          </AlertDescription>
        </Alert>

        {/* New Form */}
        {showNewForm && renderForm(true)}

        {/* Existing Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Areas
            </CardTitle>
            <CardDescription>
              Areas are checked in priority order. Lower priority numbers are checked first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serviceAreas && serviceAreas.length > 0 ? (
              <div className="space-y-3">
                {serviceAreas.map((area) => {
                  const areaType = AREA_TYPES.find((t) => t.value === area.area_type)
                  const Icon = areaType?.icon ?? Circle

                  if (editingId === area.id) {
                    return <div key={area.id}>{renderForm(false)}</div>
                  }

                  return (
                    <div
                      key={area.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                    >
                      <div className="cursor-move text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            #{area.priority}
                          </span>
                          <span className="font-medium">{area.name}</span>
                          <Badge variant="outline">{areaType?.label}</Badge>
                          {!area.is_active && <Badge variant="secondary">Inactive</Badge>}
                          {area.surcharge_type && (
                            <Badge variant="secondary">
                              +{area.surcharge_value}
                              {area.surcharge_type === 'percentage' ? '%' : area.surcharge_type === 'per_mile' ? '/mi' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {area.area_type === 'radius' && (
                            <>
                              {area.radius_miles} mile radius from ({area.center_latitude?.toFixed(4)},{' '}
                              {area.center_longitude?.toFixed(4)})
                            </>
                          )}
                          {area.area_type === 'zip_codes' && (
                            <>
                              {area.zip_codes?.length ?? 0} ZIP codes: {area.zip_codes?.slice(0, 5).join(', ')}
                              {(area.zip_codes?.length ?? 0) > 5 && '...'}
                            </>
                          )}
                          {area.area_type === 'polygon' && <>Custom polygon boundary</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={area.is_active}
                            onCheckedChange={() => handleToggle(area)}
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(area)}>
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
                              <AlertDialogTitle>Delete Service Area</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the &quot;{area.name}&quot; service area?
                                Properties in this area will no longer be automatically assigned to this
                                location.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(area.id)}
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
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Service Areas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add service areas to define the geographic coverage for this location.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Service Area
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
