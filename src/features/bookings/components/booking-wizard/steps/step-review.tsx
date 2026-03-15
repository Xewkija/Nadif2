'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  User,
  MapPin,
  Sparkles,
  Calendar,
  Clock,
  Repeat,
  FileText,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PaymentRequirements } from '@/features/payments/components'
import { useWizard } from '../wizard-context'
import { PricingSummary } from '../pricing-summary'
import type { ServiceTypeCode, BookingFrequencyCode, TimeWindowCode } from '@/types/database'

const serviceTypeLabels: Record<ServiceTypeCode, string> = {
  standard: 'Standard Clean',
  deep: 'Deep Clean',
  move_in: 'Move-In Clean',
  move_out: 'Move-Out Clean',
  post_construction: 'Post-Construction',
  commercial: 'Commercial',
  specialty: 'Specialty',
}

const frequencyLabels: Record<BookingFrequencyCode, string> = {
  onetime: 'One-time',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  custom: 'Custom',
}

const timeWindowLabels: Record<TimeWindowCode, string> = {
  morning: 'Morning (8 AM - 12 PM)',
  afternoon: 'Afternoon (12 PM - 5 PM)',
  anytime: 'Anytime',
  specific: 'Specific Time',
  exact: 'Exact Time',
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

type StepReviewProps = {
  onSuccess: () => void
}

export function StepReview({ onSuccess }: StepReviewProps) {
  const { state, actions } = useWizard()
  const { data, isSaving } = state
  const [error, setError] = useState<string | null>(null)
  const [successAction, setSuccessAction] = useState<'draft' | 'quote' | 'confirm' | null>(null)

  const handleSaveDraft = async () => {
    setError(null)
    const result = await actions.saveDraft()
    if (result) {
      setSuccessAction('draft')
      setTimeout(() => onSuccess(), 1500)
    } else {
      setError('Failed to save draft. Please try again.')
    }
  }

  const handleSendQuote = async () => {
    setError(null)
    const result = await actions.sendQuote()
    if (result) {
      setSuccessAction('quote')
      setTimeout(() => onSuccess(), 1500)
    } else {
      setError('Failed to send quote. Please try again.')
    }
  }

  const handleConfirmBooking = async () => {
    setError(null)
    const result = await actions.confirmBooking()
    if (result) {
      setSuccessAction('confirm')
      setTimeout(() => onSuccess(), 1500)
    } else {
      setError('Failed to confirm booking. Please try again.')
    }
  }

  // Validation
  const isComplete = !!(
    data.customerId &&
    data.propertyId &&
    data.serviceId &&
    data.scheduledDate
  )

  if (successAction) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {successAction === 'draft' && 'Draft Saved!'}
          {successAction === 'quote' && 'Quote Sent!'}
          {successAction === 'confirm' && 'Booking Confirmed!'}
        </h2>
        <p className="text-muted-foreground">
          {successAction === 'draft' && 'Your booking draft has been saved.'}
          {successAction === 'quote' && 'The customer will receive their quote shortly.'}
          {successAction === 'confirm' && 'The booking has been confirmed and scheduled.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h3 className="font-medium">Review Booking Details</h3>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Customer & Property */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer & Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.customer ? (
              <div>
                <p className="font-medium">
                  {data.customer.first_name} {data.customer.last_name}
                </p>
                {data.customer.email && (
                  <p className="text-sm text-muted-foreground">{data.customer.email}</p>
                )}
                {data.customer.phone && (
                  <p className="text-sm text-muted-foreground">{data.customer.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No customer selected</p>
            )}

            <Separator />

            {data.property ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{data.property.address_line1}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.property.city}, {data.property.state} {data.property.postal_code}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {data.property.bedrooms && <span>{data.property.bedrooms} bed</span>}
                    {data.property.bathrooms && <span>{data.property.bathrooms} bath</span>}
                    {data.property.square_feet && (
                      <span>{data.property.square_feet.toLocaleString()} sqft</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No property selected</p>
            )}
          </CardContent>
        </Card>

        {/* Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.service ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{data.service.name}</p>
                  <Badge variant="secondary">
                    {serviceTypeLabels[data.service.service_type]}
                  </Badge>
                </div>
                {data.service.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.service.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No service selected</p>
            )}

            {data.addOns.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Add-ons:</p>
                  <ul className="space-y-1">
                    {data.addOns.map((addOn) => (
                      <li key={addOn.id} className="text-sm text-muted-foreground">
                        • {addOn.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">Frequency:</span>{' '}
                {frequencyLabels[data.frequency]}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.scheduledDate ? (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(data.scheduledDate), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">No date selected</p>
            )}

            {data.scheduledTimeWindow && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {data.scheduledTimeWindow === 'specific' && data.scheduledTimeStart
                    ? formatTime(data.scheduledTimeStart)
                    : timeWindowLabels[data.scheduledTimeWindow]}
                </span>
              </div>
            )}

            {data.customerNotes && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Special Instructions:</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {data.customerNotes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Requirements */}
        {data.customerId && data.serviceId && (
          <PaymentRequirements
            customerId={data.customerId}
            serviceId={data.serviceId}
          />
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || !isComplete}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>

          <Button
            variant="outline"
            onClick={handleSendQuote}
            disabled={isSaving || !isComplete}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Quote
          </Button>

          <Button
            onClick={handleConfirmBooking}
            disabled={isSaving || !isComplete}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Confirm Booking
          </Button>
        </div>

        {!isComplete && (
          <p className="text-sm text-amber-600 text-center">
            Please complete all required steps before confirming.
          </p>
        )}
      </div>

      {/* Pricing Summary - Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <PricingSummary />
        </div>
      </div>
    </div>
  )
}
