'use client'

import { useState, useEffect } from 'react'
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { useCreateSetupIntent, useStripeConnectStatus } from '../hooks'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'

type CardCollectionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  onSuccess?: () => void
}

// Stripe promise initialized per connected account
const stripePromiseCache = new Map<string, Promise<Stripe | null>>()

function getStripePromise(connectedAccountId: string): Promise<Stripe | null> {
  if (!stripePromiseCache.has(connectedAccountId)) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('Stripe publishable key not configured')
      return Promise.resolve(null)
    }
    stripePromiseCache.set(
      connectedAccountId,
      loadStripe(key, { stripeAccount: connectedAccountId })
    )
  }
  return stripePromiseCache.get(connectedAccountId)!
}

type SetupFormProps = {
  onSuccess: () => void
  onCancel: () => void
}

function SetupForm({ onSuccess, onCancel }: SetupFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?card_saved=true`,
      },
      redirect: 'if_required',
    })

    if (submitError) {
      setError(submitError.message ?? 'Failed to save card')
      setProcessing(false)
      return
    }

    // Success - card saved via webhook
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || processing}
          className="flex-1"
        >
          {processing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Save Card
        </Button>
      </div>
    </form>
  )
}

export function CardCollectionSheet({
  open,
  onOpenChange,
  customerId,
  onSuccess,
}: CardCollectionSheetProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  const { data: connectStatus } = useStripeConnectStatus()
  const createSetupIntent = useCreateSetupIntent()

  // Initialize SetupIntent when sheet opens
  useEffect(() => {
    if (open && customerId && !clientSecret) {
      initializeSetupIntent()
    }
  }, [open, customerId])

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      setConnectedAccountId(null)
      setInitError(null)
    }
  }, [open])

  const initializeSetupIntent = async () => {
    try {
      setInitError(null)
      const result = await createSetupIntent.mutateAsync({ customerId })
      setClientSecret(result.clientSecret)
      setConnectedAccountId(result.connectedAccountId)
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to initialize card form')
    }
  }

  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  // Check if Stripe is ready
  const isStripeReady = connectStatus?.chargesEnabled

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Add Payment Method</SheetTitle>
          <SheetDescription>
            Add a card to enable payments for this customer
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          {!isStripeReady && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stripe payments are not configured. Please complete your Stripe setup first.
              </AlertDescription>
            </Alert>
          )}

          {isStripeReady && initError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{initError}</AlertDescription>
            </Alert>
          )}

          {isStripeReady && createSetupIntent.isPending && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Initializing secure form...</p>
            </div>
          )}

          {isStripeReady && clientSecret && connectedAccountId && (
            <Elements
              stripe={getStripePromise(connectedAccountId)}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: 'hsl(var(--primary))',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <SetupForm onSuccess={handleSuccess} onCancel={handleCancel} />
            </Elements>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
