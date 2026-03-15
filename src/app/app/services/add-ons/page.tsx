'use client'

import { useState } from 'react'
import { Plus, Package, MoreHorizontal, Pencil, Archive } from 'lucide-react'
import { useAddOns, useArchiveAddOn } from '@/features/services/hooks'
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
import { AddOnSheet } from './components/add-on-sheet'
import type { AddOnScopeMode } from '@/types/database'

const scopeModeLabels: Record<AddOnScopeMode, string> = {
  all_services: 'All Services',
  specific_services: 'Specific Services',
  service_types: 'Service Types',
}

const priceTypeLabels: Record<string, string> = {
  flat: 'Flat',
  per_room: 'Per Room',
  per_sqft: 'Per Sq Ft',
  hourly: 'Hourly',
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export default function AddOnsPage() {
  const { data: addOns, isLoading, error } = useAddOns()
  const archiveMutation = useArchiveAddOn()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null)

  const handleNewAddOn = () => {
    setEditingAddOnId(null)
    setSheetOpen(true)
  }

  const handleEditAddOn = (addOnId: string) => {
    setEditingAddOnId(addOnId)
    setSheetOpen(true)
  }

  const handleArchiveAddOn = async (addOnId: string) => {
    if (confirm('Are you sure you want to archive this add-on? It will no longer be available for new bookings.')) {
      await archiveMutation.mutateAsync(addOnId)
    }
  }

  const handleSheetClose = () => {
    setSheetOpen(false)
    setEditingAddOnId(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load add-ons</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Add-ons"
        description="Extra services customers can add to their bookings"
        actions={
          <Button onClick={handleNewAddOn}>
            <Plus className="mr-2 h-4 w-4" />
            New Add-on
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : addOns && addOns.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Add-on</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {addOns.map((addOn) => (
                <TableRow key={addOn.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{addOn.name}</span>
                      {addOn.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {addOn.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPrice(addOn.price_cents)}</span>
                      <Badge variant="outline" className="text-xs">
                        {priceTypeLabels[addOn.price_type] || addOn.price_type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {scopeModeLabels[addOn.scope_mode]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {addOn.is_active ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        Inactive
                      </Badge>
                    )}
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
                        <DropdownMenuItem onClick={() => handleEditAddOn(addOn.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleArchiveAddOn(addOn.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
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
          icon={Package}
          title="No add-ons yet"
          description="Create add-ons to let customers enhance their bookings with extra services like inside fridge cleaning, oven cleaning, or window washing."
          action={{
            label: 'Create Add-on',
            onClick: handleNewAddOn,
          }}
        />
      )}

      <AddOnSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        addOnId={editingAddOnId}
      />
    </div>
  )
}
