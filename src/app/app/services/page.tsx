'use client'

import { useState } from 'react'
import { Plus, Sparkles, MoreHorizontal, Pencil, Archive } from 'lucide-react'
import { useServices, useArchiveService } from '@/features/services/hooks'
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
import { ServiceSheet } from './components/service-sheet'
import type { ServiceTypeCode } from '@/types/database'

const serviceTypeLabels: Record<ServiceTypeCode, string> = {
  standard: 'Standard',
  deep: 'Deep Clean',
  move_in: 'Move In',
  move_out: 'Move Out',
  post_construction: 'Post Construction',
  commercial: 'Commercial',
  specialty: 'Specialty',
}

const serviceTypeColors: Record<ServiceTypeCode, string> = {
  standard: 'bg-blue-100 text-blue-800',
  deep: 'bg-purple-100 text-purple-800',
  move_in: 'bg-green-100 text-green-800',
  move_out: 'bg-orange-100 text-orange-800',
  post_construction: 'bg-yellow-100 text-yellow-800',
  commercial: 'bg-slate-100 text-slate-800',
  specialty: 'bg-pink-100 text-pink-800',
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export default function ServicesPage() {
  const { data: services, isLoading, error } = useServices()
  const archiveMutation = useArchiveService()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  const handleNewService = () => {
    setEditingServiceId(null)
    setSheetOpen(true)
  }

  const handleEditService = (serviceId: string) => {
    setEditingServiceId(serviceId)
    setSheetOpen(true)
  }

  const handleArchiveService = async (serviceId: string) => {
    if (confirm('Are you sure you want to archive this service? It will no longer be available for new bookings.')) {
      await archiveMutation.mutateAsync(serviceId)
    }
  }

  const handleSheetClose = () => {
    setSheetOpen(false)
    setEditingServiceId(null)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load services</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Services"
        description="Manage your service catalog and pricing"
        actions={
          <Button onClick={handleNewService}>
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : services && services.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Service</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{service.name}</span>
                      {service.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={serviceTypeColors[service.service_type]}
                    >
                      {serviceTypeLabels[service.service_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(service.base_price_cents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(service.estimated_duration_minutes)}
                  </TableCell>
                  <TableCell>
                    {service.is_active ? (
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
                        <DropdownMenuItem onClick={() => handleEditService(service.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleArchiveService(service.id)}
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
          icon={Sparkles}
          title="No services yet"
          description="Create your first service to start accepting bookings. Services define what you offer and how much you charge."
          action={{
            label: 'Create Service',
            onClick: handleNewService,
          }}
        />
      )}

      <ServiceSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        serviceId={editingServiceId}
      />
    </div>
  )
}
