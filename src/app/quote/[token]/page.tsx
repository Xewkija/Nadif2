'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type QuoteData = {
  id: string
  status: string
  service_name: string
  service_description: string | null
  scheduled_date: string | null
  scheduled_time_start: string | null
  scheduled_time_window: string | null
  total_price_cents: number
  address_line1: string
  city: string
  state: string
  postal_code: string
  customer_first_name: string
  quote_expires_at: string | null
  tenant_name: string
  add_ons: { name: string; price_cents: number }[]
}

function formatPrice(cents: number): string {
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

export default function QuotePage() {
  const params = useParams()
  const token = params.token as string

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<'accepted' | 'declined' | null>(null)

  useEffect(() => {
    fetchQuote()
  }, [token])

  const fetchQuote = async () => {
    try {
      const supabase = createClient()
      // Note: get_quote_by_token is defined in migration 00014_quote_tokens.sql
      // Types will be available after migration is applied and types regenerated
      const { data, error: fetchError } = await (supabase.rpc as CallableFunction)(
        'get_quote_by_token',
        { p_token: token }
      )

      if (fetchError) throw new Error(fetchError.message)

      const result = data as { success: boolean; quote?: QuoteData; error?: string }
      if (!result.success) {
        setError(result.error ?? 'Quote not found')
        return
      }

      setQuote(result.quote ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      const supabase = createClient()
      // Note: accept_quote_by_customer is defined in migration 00014_quote_tokens.sql
      const { data, error: acceptError } = await (supabase.rpc as CallableFunction)(
        'accept_quote_by_customer',
        { p_token: token }
      )

      if (acceptError) throw new Error(acceptError.message)

      const result = data as { success: boolean; error?: string }
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to accept quote')
      }

      setActionResult('accepted')
      setQuote((prev) => prev ? { ...prev, status: 'quote_accepted' } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept quote')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this quote?')) return

    setActionLoading(true)
    try {
      const supabase = createClient()
      // Note: decline_quote_by_customer is defined in migration 00014_quote_tokens.sql
      const { data, error: declineError } = await (supabase.rpc as CallableFunction)(
        'decline_quote_by_customer',
        { p_token: token }
      )

      if (declineError) throw new Error(declineError.message)

      const result = data as { success: boolean; error?: string }
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to decline quote')
      }

      setActionResult('declined')
      setQuote((prev) => prev ? { ...prev, status: 'quote_declined' } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline quote')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Quote Not Found</h1>
            <p className="text-muted-foreground">
              {error || 'This quote may have expired or is no longer available.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = quote.quote_expires_at && new Date(quote.quote_expires_at) < new Date()
  const canRespond = quote.status === 'quote_pending' && !isExpired

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">{quote.tenant_name}</h1>
          <p className="text-muted-foreground mt-1">Service Quote</p>
        </div>

        {/* Status Banner */}
        {actionResult === 'accepted' && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
              <h2 className="text-lg font-semibold text-green-800">Quote Accepted!</h2>
              <p className="text-green-700 mt-1">
                Thank you for accepting this quote. We&apos;ll be in touch soon to confirm the details.
              </p>
            </CardContent>
          </Card>
        )}

        {actionResult === 'declined' && (
          <Card className="mb-6 border-gray-200 bg-gray-50">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 mx-auto text-gray-500 mb-3" />
              <h2 className="text-lg font-semibold">Quote Declined</h2>
              <p className="text-muted-foreground mt-1">
                This quote has been declined. Feel free to reach out if you change your mind.
              </p>
            </CardContent>
          </Card>
        )}

        {isExpired && quote.status === 'quote_pending' && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-orange-600 mb-3" />
              <h2 className="text-lg font-semibold text-orange-800">Quote Expired</h2>
              <p className="text-orange-700 mt-1">
                This quote has expired. Please contact us for a new quote.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Greeting */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-lg">
              Hi {quote.customer_first_name},
            </p>
            <p className="text-muted-foreground mt-2">
              Here&apos;s your quote for the requested cleaning service. Please review the details below.
            </p>
          </CardContent>
        </Card>

        {/* Quote Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service */}
            <div>
              <h3 className="font-medium text-lg">{quote.service_name}</h3>
              {quote.service_description && (
                <p className="text-muted-foreground mt-1">{quote.service_description}</p>
              )}
            </div>

            <Separator />

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {quote.scheduled_date
                      ? format(new Date(quote.scheduled_date), 'EEEE, MMMM d, yyyy')
                      : 'To be scheduled'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {quote.scheduled_time_start
                      ? formatTime(quote.scheduled_time_start)
                      : quote.scheduled_time_window || 'To be confirmed'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Service Location</p>
                <p className="font-medium">{quote.address_line1}</p>
                <p className="text-muted-foreground">
                  {quote.city}, {quote.state} {quote.postal_code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>{quote.service_name}</span>
                <span>{formatPrice(quote.total_price_cents - (quote.add_ons?.reduce((sum, a) => sum + a.price_cents, 0) ?? 0))}</span>
              </div>
              {quote.add_ons?.map((addon, i) => (
                <div key={i} className="flex justify-between text-muted-foreground">
                  <span>{addon.name}</span>
                  <span>{formatPrice(addon.price_cents)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(quote.total_price_cents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiration */}
        {quote.quote_expires_at && !isExpired && canRespond && (
          <p className="text-center text-sm text-muted-foreground mb-6">
            This quote is valid until{' '}
            {format(new Date(quote.quote_expires_at), 'MMMM d, yyyy')}
          </p>
        )}

        {/* Actions */}
        {canRespond && (
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={actionLoading}
            >
              Decline Quote
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Quote
                </>
              )}
            </Button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Questions? Reply to the email we sent or give us a call.
        </p>
      </div>
    </div>
  )
}
