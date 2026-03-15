'use client'

import { useState } from 'react'
import { Search, User, MapPin, Plus, Check, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useSearchCustomers } from '@/features/customers/hooks/use-customers'
import { useProperties } from '@/features/customers/hooks/use-properties'
import { useWizard } from '../wizard-context'
import type { Customer, Property, CustomerType } from '@/types/database'

const customerTypeLabels: Record<CustomerType, string> = {
  lead: 'Lead',
  customer: 'Customer',
  repeat: 'Repeat',
  vip: 'VIP',
  inactive: 'Inactive',
  do_not_service: 'Do Not Service',
}

const customerTypeColors: Record<CustomerType, string> = {
  lead: 'bg-blue-100 text-blue-800',
  customer: 'bg-green-100 text-green-800',
  repeat: 'bg-purple-100 text-purple-800',
  vip: 'bg-amber-100 text-amber-800',
  inactive: 'bg-gray-100 text-gray-600',
  do_not_service: 'bg-red-100 text-red-800',
}

export function StepCustomer() {
  const { state, actions } = useWizard()
  const { data } = state
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const { data: searchResults, isLoading: isSearching } = useSearchCustomers(searchQuery)
  const { data: properties, isLoading: isLoadingProperties } = useProperties(
    data.customerId ?? undefined
  )

  const handleSelectCustomer = (customer: Customer) => {
    actions.setCustomer(customer)
    setSearchQuery('')
  }

  const handleSelectProperty = (property: Property) => {
    actions.setProperty(property)
  }

  // If customer is selected, show property selection
  if (data.customer) {
    return (
      <div className="space-y-6">
        {/* Selected Customer */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Selected Customer</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.setCustomer(null)}
            >
              Change
            </Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {data.customer.first_name} {data.customer.last_name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={customerTypeColors[data.customer.customer_type]}
                    >
                      {customerTypeLabels[data.customer.customer_type]}
                    </Badge>
                  </div>
                  {data.customer.email && (
                    <p className="text-sm text-muted-foreground">{data.customer.email}</p>
                  )}
                  {data.customer.phone && (
                    <p className="text-sm text-muted-foreground">{data.customer.phone}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Property Selection */}
        <div>
          <h3 className="font-medium mb-3">Select Property</h3>

          {isLoadingProperties ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading properties...
            </div>
          ) : properties && properties.length > 0 ? (
            <div className="grid gap-3">
              {properties.map((property) => {
                const isSelected = data.propertyId === property.id
                return (
                  <Card
                    key={property.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleSelectProperty(property)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.address_line1}</span>
                            {property.is_primary && (
                              <Badge variant="outline" className="text-xs">
                                Primary
                              </Badge>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {property.city}, {property.state} {property.postal_code}
                          </p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {property.bedrooms && <span>{property.bedrooms} bed</span>}
                            {property.bathrooms && <span>{property.bathrooms} bath</span>}
                            {property.square_feet && (
                              <span>{property.square_feet.toLocaleString()} sqft</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-3">
                  No properties found for this customer
                </p>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Customer search view
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3">Search Customer</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div>
          {isSearching ? (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="grid gap-2">
              {searchResults.map((customer) => (
                <Card
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={customerTypeColors[customer.customer_type]}
                          >
                            {customerTypeLabels[customer.customer_type]}
                          </Badge>
                        </div>
                        {customer.email && (
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-3">
                  No customers found matching &quot;{searchQuery}&quot;
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCustomer(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial state */}
      {searchQuery.length < 2 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">Start by selecting a customer</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Search for an existing customer or create a new one
            </p>
            <Button
              variant="outline"
              onClick={() => setShowNewCustomer(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Customer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
