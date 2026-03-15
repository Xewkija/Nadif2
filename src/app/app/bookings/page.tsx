'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Plus,
  ClipboardList,
  MoreHorizontal,
  Eye,
  Calendar,
  MapPin,
  User,
  Clock,
} from 'lucide-react'
import { useBookings } from '@/features/bookings/hooks'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { BookingStatus } from '@/types/database'

const statusLabels: Record<BookingStatus, string> = {
  draft: 'Draft',
  quote_pending: 'Quote Sent',
  quote_accepted: 'Quote Accepted',
  quote_expired: 'Quote Expired',
  quote_declined: 'Quote Declined',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
}

const statusColors: Record<BookingStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  quote_pending: 'bg-yellow-100 text-yellow-800',
  quote_accepted: 'bg-blue-100 text-blue-800',
  quote_expired: 'bg-orange-100 text-orange-800',
  quote_declined: 'bg-red-100 text-red-800',
  confirmed: 'bg-green-100 text-green-800',
  scheduled: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  skipped: 'bg-slate-100 text-slate-600',
}

type TabValue = 'active' | 'quotes' | 'completed' | 'all'

const tabFilters: Record<TabValue, BookingStatus[] | undefined> = {
  active: ['confirmed', 'scheduled', 'in_progress'],
  quotes: ['draft', 'quote_pending', 'quote_accepted'],
  completed: ['completed'],
  all: undefined,
}

function formatPrice(cents: number | null | undefined): string {
  if (!cents) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('active')

  const statusFilter = tabFilters[activeTab]
  const { data: bookings, isLoading, error } = useBookings({
    status: statusFilter,
    includeCompleted: activeTab === 'completed' || activeTab === 'all',
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load bookings</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Manage all your bookings and appointments"
        actions={
          <Button asChild>
            <Link href="/app/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : bookings && bookings.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <Link
                      href={`/app/bookings/${booking.id}`}
                      className="block hover:underline"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {booking.customer?.first_name} {booking.customer?.last_name}
                          </span>
                          {booking.property && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {booking.property.address_line1}, {booking.property.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{booking.service?.name}</span>
                  </TableCell>
                  <TableCell>
                    {booking.scheduled_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span>{format(new Date(booking.scheduled_date), 'MMM d, yyyy')}</span>
                          {booking.scheduled_time_start && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(booking.scheduled_time_start)}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[booking.status]}>
                      {statusLabels[booking.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(booking.total_price_cents)}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/app/bookings/${booking.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
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
          icon={ClipboardList}
          title={activeTab === 'active' ? 'No active bookings' : 'No bookings found'}
          description={
            activeTab === 'active'
              ? 'Create a new booking to get started with scheduling.'
              : 'No bookings match the current filter.'
          }
          action={{
            label: 'Create Booking',
            onClick: () => window.location.href = '/app/bookings/new',
          }}
        />
      )}
    </div>
  )
}
