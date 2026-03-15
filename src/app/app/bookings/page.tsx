'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isToday, isThisWeek } from 'date-fns'
import { Plus, ClipboardList, MoreHorizontal, Eye } from 'lucide-react'
import { useBookings } from '@/features/bookings/hooks'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { StatusBadge } from '@/components/ui/status-badge'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BookingStatus } from '@/types/database'

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

function BookingLifecycleModule() {
  return (
    <div className="rounded-xl bg-muted/50 p-6">
      <h4 className="text-sm font-medium text-muted-foreground mb-4 text-center uppercase tracking-wide">
        How Bookings Work
      </h4>
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
            <span className="text-xs font-medium">1</span>
          </div>
          <span className="text-muted-foreground">Create</span>
        </div>
        <div className="flex-1 h-px bg-border mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
            <span className="text-xs font-medium">2</span>
          </div>
          <span className="text-muted-foreground">Schedule</span>
        </div>
        <div className="flex-1 h-px bg-border mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-2">
            <span className="text-xs font-medium">3</span>
          </div>
          <span className="text-muted-foreground">Assign</span>
        </div>
        <div className="flex-1 h-px bg-border mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-success-muted flex items-center justify-center mb-2">
            <span className="text-xs font-medium text-success">4</span>
          </div>
          <span className="text-muted-foreground">Complete</span>
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>('active')

  const statusFilter = tabFilters[activeTab]
  const {
    data: bookings,
    isLoading,
    error,
  } = useBookings({
    status: statusFilter,
    includeCompleted: activeTab === 'completed' || activeTab === 'all',
  })

  // Compute stats from all bookings (we'd ideally have a separate stats query)
  const { data: allBookings } = useBookings({ includeCompleted: true })

  const stats = useMemo(() => {
    if (!allBookings) return { today: 0, thisWeek: 0, pendingQuotes: 0 }

    let today = 0
    let thisWeek = 0
    let pendingQuotes = 0

    allBookings.forEach((booking) => {
      if (booking.scheduled_date) {
        const date = new Date(booking.scheduled_date)
        if (isToday(date)) today++
        if (isThisWeek(date)) thisWeek++
      }
      if (booking.status === 'quote_pending') pendingQuotes++
    })

    return { today, thisWeek, pendingQuotes }
  }, [allBookings])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load bookings</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Top Band - Bookings specific */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your bookings and appointments
            </p>
          </div>
          <Button asChild>
            <Link href="/app/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6">
          <Stat label="Today" value={stats.today} />
          <Stat label="This Week" value={stats.thisWeek} />
          <Stat
            label="Pending Quotes"
            value={stats.pendingQuotes}
            variant={stats.pendingQuotes > 0 ? 'warning' : 'default'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Collection */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : bookings && bookings.length > 0 ? (
        <div className="rounded-xl ring-1 ring-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="min-w-[200px]">Customer</TableHead>
                <TableHead className="w-[180px]">Service</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-primary-subtle transition-colors"
                  onClick={() => router.push(`/app/bookings/${booking.id}`)}
                >
                  {/* Date Block */}
                  <TableCell className="py-4">
                    {booking.scheduled_date ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">
                          {format(new Date(booking.scheduled_date), 'MMM d')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(booking.scheduled_date), 'EEEE')}
                        </span>
                        {booking.scheduled_time_start && (
                          <span className="text-sm text-muted-foreground">
                            {formatTime(booking.scheduled_time_start)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Not scheduled
                      </span>
                    )}
                  </TableCell>

                  {/* Customer Stack */}
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">
                        {booking.customer?.first_name}{' '}
                        {booking.customer?.last_name}
                      </span>
                      {booking.property && (
                        <span className="text-xs text-muted-foreground">
                          {booking.property.address_line1},{' '}
                          {booking.property.city}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Service Stack */}
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">
                        {booking.service?.name}
                      </span>
                      {booking.property && (
                        <span className="text-xs text-muted-foreground">
                          {booking.property.bedrooms} bed
                          {booking.property.bedrooms !== 1 ? 's' : ''} &bull;{' '}
                          {booking.property.bathrooms} bath
                          {booking.property.bathrooms !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4">
                    <StatusBadge status={booking.status} />
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="py-4 text-right font-semibold text-sm">
                    {formatPrice(booking.total_price_cents)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
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
          title={
            activeTab === 'active'
              ? 'Create Your First Booking'
              : 'No bookings found'
          }
          description={
            activeTab === 'active'
              ? 'Bookings are the core of your cleaning business. Each booking represents a scheduled service for a customer at their property.'
              : 'No bookings match the current filter.'
          }
          teachingModule={activeTab === 'active' ? <BookingLifecycleModule /> : undefined}
          action={{
            label:
              activeTab === 'active'
                ? 'Create Your First Booking'
                : 'Create Booking',
            href: '/app/bookings/new',
          }}
          secondaryText={
            activeTab === 'active'
              ? 'After creating a booking, you can manage scheduling, send quotes, track payments, and assign providers.'
              : undefined
          }
        />
      )}
    </div>
  )
}
