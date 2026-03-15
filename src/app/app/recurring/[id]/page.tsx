'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Repeat,
  Sparkles,
  Pause,
  Play,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react'
import {
  useRecurringSeriesDetail,
  useSeriesOccurrences,
  usePauseSeries,
  useResumeSeries,
  useCancelSeries,
  useGenerateOccurrences,
} from '@/features/recurring/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { RecurringSeriesStatus, BookingFrequencyCode, BookingStatus } from '@/types/database'

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

const bookingStatusLabels: Record<BookingStatus, string> = {
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

const bookingStatusColors: Record<BookingStatus, string> = {
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

function formatPrice(cents: number | null | undefined): string {
  if (!cents) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export default function RecurringSeriesDetailPage() {
  const params = useParams()
  const router = useRouter()
  const seriesId = params.id as string

  const { data: series, isLoading, error } = useRecurringSeriesDetail(seriesId)
  const { data: occurrences, isLoading: isLoadingOccurrences } = useSeriesOccurrences(seriesId)

  const pauseMutation = usePauseSeries()
  const resumeMutation = useResumeSeries()
  const cancelMutation = useCancelSeries()
  const generateMutation = useGenerateOccurrences()

  const [pauseDialogOpen, setPauseDialogOpen] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const isPending =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending ||
    generateMutation.isPending

  const handlePause = async () => {
    await pauseMutation.mutateAsync({ seriesId, reason: pauseReason })
    setPauseDialogOpen(false)
    setPauseReason('')
  }

  const handleResume = async () => {
    const result = await resumeMutation.mutateAsync({ seriesId })
    if (result.deep_clean_check?.required) {
      alert('Note: Deep clean may be required after this pause. Check the returned recommendations.')
    }
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync({ seriesId, reason: cancelReason })
    setCancelDialogOpen(false)
    setCancelReason('')
  }

  const handleGenerateOccurrences = async () => {
    await generateMutation.mutateAsync(seriesId)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load recurring series</p>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => router.push('/app/recurring')}>
          Back to Recurring
        </Button>
      </div>
    )
  }

  if (isLoading || !series) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/recurring">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {series.customer?.first_name} {series.customer?.last_name}
              </h1>
              <Badge variant="secondary" className={statusColors[series.status]}>
                {statusLabels[series.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {frequencyLabels[series.frequency]} &middot; {series.service?.name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {series.status === 'active' && (
            <Button variant="outline" onClick={() => setPauseDialogOpen(true)} disabled={isPending}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {series.status === 'paused' && (
            <Button onClick={handleResume} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          {series.status !== 'cancelled' && (
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Pause Warning */}
      {series.status === 'paused' && series.pause_reason && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Series Paused</AlertTitle>
          <AlertDescription>
            Reason: {series.pause_reason}
            {series.paused_at && (
              <span className="block text-sm mt-1">
                Paused on {format(new Date(series.paused_at), 'MMMM d, yyyy')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Frequency</p>
                  <p className="font-medium flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    {frequencyLabels[series.frequency]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(series.start_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                {series.end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {format(new Date(series.end_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
                {series.next_occurrence_date && series.status === 'active' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Next Occurrence</p>
                    <p className="font-medium">
                      {format(new Date(series.next_occurrence_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {series.preferred_time_window && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Preferred time: <span className="font-medium capitalize">{series.preferred_time_window}</span>
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Recurring Service (Maintenance)</p>
                <p className="font-medium">{series.service?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {series.service?.service_type?.replace('_', ' ')}
                </p>
              </div>

              {series.override_service && series.override_service.id !== series.service?.id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">First Occurrence Override</p>
                    <p className="font-medium">{series.override_service.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {series.override_service.service_type?.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      First booking uses this service (typically a deep clean)
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Occurrences */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Occurrences</CardTitle>
              {series.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateOccurrences}
                  disabled={isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate More
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingOccurrences ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : occurrences && occurrences.length > 0 ? (
                <div className="space-y-2">
                  {occurrences.map((occurrence) => (
                    <Link
                      key={occurrence.id}
                      href={`/app/bookings/${occurrence.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {occurrence.scheduled_date
                              ? format(new Date(occurrence.scheduled_date), 'EEEE, MMMM d, yyyy')
                              : 'Unscheduled'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {occurrence.service?.name}
                            {occurrence.is_first_occurrence_override && (
                              <span className="ml-2 text-blue-600">(First Occurrence)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatPrice(occurrence.total_price_cents)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={bookingStatusColors[occurrence.status as BookingStatus]}
                        >
                          {bookingStatusLabels[occurrence.status as BookingStatus]}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No occurrences generated yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href={`/app/customers/${series.customer_id}`}
                className="font-medium hover:underline"
              >
                {series.customer?.first_name} {series.customer?.last_name}
              </Link>
              {series.customer?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {series.customer.email}
                </div>
              )}
              {series.customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {series.customer.phone}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              {series.property ? (
                <div className="space-y-2">
                  <p className="font-medium">{series.property.address_line1}</p>
                  <p className="text-sm text-muted-foreground">
                    {series.property.city}, {series.property.state} {series.property.postal_code}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No property</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {series.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{series.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pause Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Recurring Series</DialogTitle>
            <DialogDescription>
              Pausing will stop new occurrences from being generated. You can resume at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pause-reason">Reason (optional)</Label>
              <Textarea
                id="pause-reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Why is this series being paused?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePause} disabled={isPending}>
              Pause Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Recurring Series</DialogTitle>
            <DialogDescription>
              This will cancel all future bookings in this series. Completed bookings will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this series being cancelled?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Series
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              Cancel Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
