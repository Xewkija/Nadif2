'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Plus,
  Repeat,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  XCircle,
  Calendar,
  MapPin,
  User,
} from 'lucide-react'
import {
  useRecurringSeries,
  usePauseSeries,
  useResumeSeries,
  useCancelSeries,
} from '@/features/recurring/hooks'
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { RecurringSeriesStatus, BookingFrequencyCode } from '@/types/database'

const statusLabels: Record<RecurringSeriesStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
}

const statusColors: Record<RecurringSeriesStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
}

const frequencyLabels: Record<BookingFrequencyCode, string> = {
  onetime: 'One-time',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  custom: 'Custom',
}

type TabValue = 'active' | 'paused' | 'all'

const tabFilters: Record<TabValue, RecurringSeriesStatus[] | undefined> = {
  active: ['active'],
  paused: ['paused'],
  all: undefined,
}

export default function RecurringSeriesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('active')

  const statusFilter = tabFilters[activeTab]
  const { data: series, isLoading, error } = useRecurringSeries(
    statusFilter ? { status: statusFilter } : undefined
  )

  const pauseMutation = usePauseSeries()
  const resumeMutation = useResumeSeries()
  const cancelMutation = useCancelSeries()

  const isPending = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending

  const handlePause = async (seriesId: string) => {
    await pauseMutation.mutateAsync({ seriesId })
  }

  const handleResume = async (seriesId: string) => {
    await resumeMutation.mutateAsync({ seriesId })
  }

  const handleCancel = async (seriesId: string) => {
    if (confirm('Are you sure you want to cancel this recurring series? This will cancel all future bookings.')) {
      await cancelMutation.mutateAsync({ seriesId })
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load recurring series</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Recurring Services"
        description="Manage recurring cleaning schedules"
        actions={
          <Button asChild>
            <Link href="/app/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Recurring
            </Link>
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : series && series.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Occurrence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/app/recurring/${s.id}`}
                      className="block hover:underline"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {s.customer?.first_name} {s.customer?.last_name}
                          </span>
                          {s.property && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {s.property.address_line1}, {s.property.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{s.service?.name}</span>
                      {s.override_service && s.override_service.id !== s.service?.id && (
                        <div className="text-xs text-muted-foreground">
                          First: {s.override_service.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Repeat className="h-3 w-3 mr-1" />
                      {frequencyLabels[s.frequency]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.next_occurrence_date ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(s.next_occurrence_date), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[s.status]}>
                      {statusLabels[s.status]}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/app/recurring/${s.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {s.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handlePause(s.id)}
                            disabled={isPending}
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Series
                          </DropdownMenuItem>
                        )}
                        {s.status === 'paused' && (
                          <DropdownMenuItem
                            onClick={() => handleResume(s.id)}
                            disabled={isPending}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume Series
                          </DropdownMenuItem>
                        )}
                        {s.status !== 'cancelled' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleCancel(s.id)}
                              disabled={isPending}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Series
                            </DropdownMenuItem>
                          </>
                        )}
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
          icon={Repeat}
          title={activeTab === 'active' ? 'No active recurring services' : 'No recurring services found'}
          description={
            activeTab === 'active'
              ? 'Create a recurring booking to set up automatic service schedules.'
              : 'No recurring services match the current filter.'
          }
          action={{
            label: 'Create Recurring Service',
            onClick: () => window.location.href = '/app/bookings/new',
          }}
        />
      )}
    </div>
  )
}
