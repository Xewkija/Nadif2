'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Home,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Calendar,
  CreditCard,
} from 'lucide-react'
import { useCustomer, useDeleteProperty, useSetPrimaryProperty } from '@/features/customers/hooks'
import { PaymentMethodsList, CardCollectionSheet } from '@/features/payments/components'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CustomerSheet } from '../components/customer-sheet'
import { PropertySheet } from './components/property-sheet'
import type { CustomerType, Property } from '@/types/database'

const customerTypeConfig: Record<CustomerType, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  lead: { label: 'Lead', variant: 'warning' },
  customer: { label: 'Customer', variant: 'default' },
  repeat: { label: 'Repeat', variant: 'success' },
  vip: { label: 'VIP', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  do_not_service: { label: 'Do Not Service', variant: 'destructive' },
}

const propertyTypeLabels: Record<string, string> = {
  apartment: 'Apartment',
  house: 'House',
  condo: 'Condo',
  townhouse: 'Townhouse',
  studio: 'Studio',
  office: 'Office',
  commercial: 'Commercial',
  other: 'Other',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const { data: customer, isLoading, error } = useCustomer(customerId)
  const deletePropertyMutation = useDeleteProperty()
  const setPrimaryMutation = useSetPrimaryProperty()

  const [editCustomerOpen, setEditCustomerOpen] = useState(false)
  const [propertySheetOpen, setPropertySheetOpen] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [cardSheetOpen, setCardSheetOpen] = useState(false)

  const handleEditProperty = (propertyId: string) => {
    setEditingPropertyId(propertyId)
    setPropertySheetOpen(true)
  }

  const handleNewProperty = () => {
    setEditingPropertyId(null)
    setPropertySheetOpen(true)
  }

  const handleDeleteProperty = async (property: Property) => {
    if (confirm(`Are you sure you want to remove this property?\n${property.address_line1}`)) {
      await deletePropertyMutation.mutateAsync({
        propertyId: property.id,
        customerId: property.customer_id,
      })
    }
  }

  const handleSetPrimary = async (property: Property) => {
    await setPrimaryMutation.mutateAsync({
      propertyId: property.id,
      customerId: property.customer_id,
    })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load customer</p>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => router.push('/app/customers')}>
          Back to Customers
        </Button>
      </div>
    )
  }

  if (isLoading || !customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const properties = customer.properties?.filter((p) => p.is_active) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {customer.first_name} {customer.last_name}
              </h1>
              <Badge variant={customerTypeConfig[customer.customer_type].variant}>
                {customerTypeConfig[customer.customer_type].label}
              </Badge>
            </div>
            {customer.notes && (
              <p className="text-muted-foreground mt-1">{customer.notes}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditCustomerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Properties
              </CardTitle>
              <Button size="sm" onClick={handleNewProperty}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {properties.length > 0 ? (
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{property.address_line1}</p>
                            {property.is_primary && (
                              <Badge variant="warning">
                                <Star className="mr-1 h-3 w-3" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          {property.address_line2 && (
                            <p className="text-sm text-muted-foreground">
                              {property.address_line2}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {property.city}, {property.state} {property.postal_code}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {property.property_type && (
                              <span>{propertyTypeLabels[property.property_type]}</span>
                            )}
                            {property.bedrooms && (
                              <span>{property.bedrooms} bed</span>
                            )}
                            {property.bathrooms && (
                              <span>{property.bathrooms} bath</span>
                            )}
                            {property.square_feet && (
                              <span>{property.square_feet.toLocaleString()} sqft</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProperty(property.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!property.is_primary && (
                            <DropdownMenuItem onClick={() => handleSetPrimary(property)}>
                              <Star className="mr-2 h-4 w-4" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProperty(property)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No properties yet. Add a property to create bookings.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleNewProperty}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking History - Placeholder for now */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3" />
                <p>No bookings yet</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodsList
                customerId={customerId}
                onAddCard={() => setCardSheetOpen(true)}
                compact
              />
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-sm hover:underline"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-sm hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.phone_secondary && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${customer.phone_secondary}`}
                    className="text-sm hover:underline"
                  >
                    {customer.phone_secondary}
                  </a>
                  <Badge variant="outline" className="text-xs">
                    Secondary
                  </Badge>
                </div>
              )}
              {customer.preferred_contact_method && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Preferred Contact</p>
                  <p className="text-sm capitalize">{customer.preferred_contact_method}</p>
                </div>
              )}
              {!customer.email && !customer.phone && (
                <p className="text-sm text-muted-foreground">
                  No contact information
                </p>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {customer.internal_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.internal_notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sheets */}
      <CustomerSheet
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customerId={customerId}
        redirectOnCreate={false}
      />

      <PropertySheet
        open={propertySheetOpen}
        onOpenChange={(open) => {
          setPropertySheetOpen(open)
          if (!open) setEditingPropertyId(null)
        }}
        customerId={customerId}
        propertyId={editingPropertyId}
      />

      <CardCollectionSheet
        open={cardSheetOpen}
        onOpenChange={setCardSheetOpen}
        customerId={customerId}
      />
    </div>
  )
}
