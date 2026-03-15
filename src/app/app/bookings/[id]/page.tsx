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
  DollarSign,
  FileText,
  UserCheck,
  Play,
  CheckCircle,
  XCircle,
  Send,
  RotateCcw,
  AlertCircle,
  Pencil,
  Star,
} from 'lucide-react'
import {
  useBooking,
  useSendQuote,
  useAcceptQuoteByStaff,
  useConfirmBooking,
  useAssignProvider,
  useUnassignProvider,
  useProviderCheckIn,
  useProviderCheckOut,
  useCancelBooking,
  useSkipOccurrence,
  useReopenAsDraft,
} from '@/features/bookings/hooks'
import { useCreateReviewRequest } from '@/features/reviews/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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

function formatPrice(cents: number | null | undefined): string {
  if (!cents) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const { data: booking, isLoading, error } = useBooking(bookingId)

  // Mutations
  const sendQuoteMutation = useSendQuote()
  const acceptQuoteMutation = useAcceptQuoteByStaff()
  const confirmMutation = useConfirmBooking()
  const assignMutation = useAssignProvider()
  const unassignMutation = useUnassignProvider()
  const checkInMutation = useProviderCheckIn()
  const checkOutMutation = useProviderCheckOut()
  const cancelMutation = useCancelBooking()
  const skipMutation = useSkipOccurrence()
  const reopenMutation = useReopenAsDraft()
  const reviewRequestMutation = useCreateReviewRequest()

  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')

  const isPending =
    sendQuoteMutation.isPending ||
    acceptQuoteMutation.isPending ||
    confirmMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    cancelMutation.isPending ||
    skipMutation.isPending ||
    reopenMutation.isPending ||
    reviewRequestMutation.isPending

  const handleSendQuote = async () => {
    await sendQuoteMutation.mutateAsync(bookingId)
  }

  const handleAcceptQuote = async () => {
    await acceptQuoteMutation.mutateAsync(bookingId)
  }

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync(bookingId)
  }

  const handleCheckIn = async () => {
    await checkInMutation.mutateAsync(bookingId)
  }

  const handleCheckOut = async () => {
    await checkOutMutation.mutateAsync({ bookingId, completionNotes })
    setCompletionDialogOpen(false)
    setCompletionNotes('')
  }

  const handleCancel = async () => {
    await cancelMutation.mutateAsync({ bookingId, reason: cancelReason })
    setCancelDialogOpen(false)
    setCancelReason('')
  }

  const handleSkip = async () => {
    if (confirm('Are you sure you want to skip this occurrence?')) {
      await skipMutation.mutateAsync(bookingId)
    }
  }

  const handleReopen = async () => {
    const result = await reopenMutation.mutateAsync(bookingId)
    if (result.booking_id) {
      router.push(`/app/bookings/${result.booking_id}`)
    }
  }

  const [reviewRequestSent, setReviewRequestSent] = useState(false)

  const handleRequestReview = async () => {
    try {
      await reviewRequestMutation.mutateAsync(bookingId)
      setReviewRequestSent(true)
    } catch (err) {
      // Error is handled by the mutation
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">Failed to load booking</p>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => router.push('/app/bookings')}>
          Back to Bookings
        </Button>
      </div>
    )
  }

  if (isLoading || !booking) {
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

  // Determine available actions based on status
  const canSendQuote = booking.status === 'draft'
  const canAcceptQuote = booking.status === 'quote_pending'
  const canConfirm = booking.status === 'quote_accepted' || booking.status === 'draft'
  const canAssign = booking.status === 'confirmed' && !booking.assigned_provider_id
  const canUnassign = booking.status === 'scheduled' && booking.assigned_provider_id
  const canCheckIn = booking.status === 'scheduled'
  const canCheckOut = booking.status === 'in_progress'
  const canCancel = ['draft', 'quote_pending', 'quote_accepted', 'confirmed', 'scheduled'].includes(booking.status)
  const canSkip = booking.recurring_series_id && ['confirmed', 'scheduled'].includes(booking.status)
  const canReopen = ['cancelled', 'quote_expired', 'quote_declined'].includes(booking.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/bookings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                Booking for {booking.customer?.first_name} {booking.customer?.last_name}
              </h1>
              <Badge variant="secondary" className={statusColors[booking.status]}>
                {statusLabels[booking.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {booking.service?.name}
              {booking.scheduled_date && (
                <> &middot; {format(new Date(booking.scheduled_date), 'EEEE, MMMM d, yyyy')}</>
              )}
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex gap-2">
          {booking.status === 'draft' && (
            <Button variant="outline" asChild>
              <Link href={`/app/bookings/new?edit=${bookingId}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {canSendQuote && (
            <Button onClick={handleSendQuote} disabled={isPending}>
              <Send className="mr-2 h-4 w-4" />
              Send Quote
            </Button>
          )}
          {canAcceptQuote && (
            <Button onClick={handleAcceptQuote} disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept Quote
            </Button>
          )}
          {canConfirm && (
            <Button onClick={handleConfirm} disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Booking
            </Button>
          )}
          {canCheckIn && (
            <Button onClick={handleCheckIn} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Start Service
            </Button>
          )}
          {canCheckOut && (
            <Button onClick={() => setCompletionDialogOpen(true)} disabled={isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          )}
          {canSkip && (
            <Button variant="outline" onClick={handleSkip} disabled={isPending}>
              Skip
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {canReopen && (
            <Button variant="outline" onClick={handleReopen} disabled={isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reopen as Draft
            </Button>
          )}
          {booking.status === 'completed' && !reviewRequestSent && (
            <Button variant="outline" onClick={handleRequestReview} disabled={isPending}>
              <Star className="mr-2 h-4 w-4" />
              Request Review
            </Button>
          )}
          {reviewRequestSent && (
            <Button variant="outline" disabled className="text-green-600">
              <CheckCircle className="mr-2 h-4 w-4" />
              Review Requested
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-medium">
                    {booking.scheduled_date
                      ? format(new Date(booking.scheduled_date), 'EEEE, MMMM d, yyyy')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time</p>
                  <p className="font-medium">
                    {booking.scheduled_time_start
                      ? formatTime(booking.scheduled_time_start)
                      : booking.scheduled_time_window || 'Not set'}
                  </p>
                </div>
              </div>

              {booking.assigned_provider_id && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Assigned Provider</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {booking.provider?.full_name || 'Unknown'}
                        </span>
                      </div>
                      {canUnassign && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unassignMutation.mutateAsync(bookingId)}
                          disabled={isPending}
                        >
                          Unassign
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {canAssign && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="text-sm">No provider assigned</p>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Assign Provider
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provider assignment UI will be added in Phase 1E
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.property ? (
                <div className="space-y-2">
                  <p className="font-medium">{booking.property.address_line1}</p>
                  {booking.property.address_line2 && (
                    <p className="text-sm text-muted-foreground">
                      {booking.property.address_line2}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {booking.property.city}, {booking.property.state} {booking.property.postal_code}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-3">
                    {booking.property.bedrooms && <span>{booking.property.bedrooms} bed</span>}
                    {booking.property.bathrooms && <span>{booking.property.bathrooms} bath</span>}
                    {booking.property.square_feet && (
                      <span>{booking.property.square_feet.toLocaleString()} sqft</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No property information</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {(booking.customer_notes || booking.internal_notes || booking.completion_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.customer_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Customer Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{booking.customer_notes}</p>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{booking.internal_notes}</p>
                  </div>
                )}
                {booking.completion_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Completion Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{booking.completion_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cancellation Info */}
          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  Cancellation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700">{booking.cancellation_reason}</p>
                {booking.cancelled_at && (
                  <p className="text-xs text-red-600 mt-2">
                    Cancelled on {format(new Date(booking.cancelled_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.customer && (
                <>
                  <Link
                    href={`/app/customers/${booking.customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {booking.customer.first_name} {booking.customer.last_name}
                  </Link>
                  {booking.customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a href={`mailto:${booking.customer.email}`} className="hover:underline">
                        {booking.customer.email}
                      </a>
                    </div>
                  )}
                  {booking.customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <a href={`tel:${booking.customer.phone}`} className="hover:underline">
                        {booking.customer.phone}
                      </a>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span>{formatPrice(booking.service?.base_price_cents)}</span>
                </div>
                {booking.add_ons && booking.add_ons.length > 0 && (
                  <>
                    {booking.add_ons.map((ba) => (
                      <div key={ba.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{ba.add_on?.name}</span>
                        <span>{formatPrice(ba.price_cents)}</span>
                      </div>
                    ))}
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatPrice(booking.total_price_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(booking.created_at), 'MMM d, h:mm a')}</span>
                </div>
                {booking.quote_sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quote Sent</span>
                    <span>{format(new Date(booking.quote_sent_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
                {booking.quote_accepted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quote Accepted</span>
                    <span>{format(new Date(booking.quote_accepted_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
                {booking.assigned_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned</span>
                    <span>{format(new Date(booking.assigned_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
                {booking.check_in_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{format(new Date(booking.check_in_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
                {booking.check_out_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span>{format(new Date(booking.check_out_at), 'MMM d, h:mm a')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Service</DialogTitle>
            <DialogDescription>
              Mark this service as completed. Add any completion notes below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="completion-notes">Completion Notes (optional)</Label>
            <Textarea
              id="completion-notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Any notes about the completed service..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckOut} disabled={checkOutMutation.isPending}>
              Complete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
