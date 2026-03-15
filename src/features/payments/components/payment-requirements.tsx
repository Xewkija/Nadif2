'use client'

import { CreditCard, AlertCircle, Check, DollarSign } from 'lucide-react'
import { useEvaluatePaymentGate } from '../hooks'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

type PaymentRequirementsProps = {
  bookingId?: string
  customerId?: string
  serviceId?: string
  amountCents?: number
  showIfNone?: boolean
}

export function PaymentRequirements({
  bookingId,
  customerId,
  serviceId,
  amountCents,
  showIfNone = false,
}: PaymentRequirementsProps) {
  const { data: requirements, isLoading, error } = useEvaluatePaymentGate({
    bookingId,
    customerId,
    serviceId,
    amountCents,
  })

  if (isLoading) {
    return (
      <div className="h-20 bg-muted animate-pulse rounded-lg" />
    )
  }

  if (error) {
    return null
  }

  if (!requirements) {
    return null
  }

  const hasRequirements = requirements.card_required ||
    requirements.deposit_required ||
    requirements.prepayment_required

  if (!hasRequirements && !showIfNone) {
    return null
  }

  if (!hasRequirements && showIfNone) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Check className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">No Payment Required Upfront</AlertTitle>
        <AlertDescription className="text-green-700">
          This booking does not require a card or deposit before service.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Payment Requirements</AlertTitle>
      <AlertDescription className="text-amber-700">
        <ul className="mt-2 space-y-2">
          {requirements.card_required && (
            <li className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Card on file required</span>
              {requirements.has_card_on_file ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  On file
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                  Missing
                </Badge>
              )}
            </li>
          )}
          {requirements.deposit_required && requirements.deposit_amount_cents > 0 && (
            <li className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>
                Deposit required: {formatCurrency(requirements.deposit_amount_cents)}
              </span>
            </li>
          )}
          {requirements.prepayment_required && (
            <li className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Full payment required before service</span>
            </li>
          )}
        </ul>
        {requirements.card_required_reason && (
          <p className="mt-2 text-xs opacity-75">
            Reason: {requirements.card_required_reason}
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
