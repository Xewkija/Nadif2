'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  DollarSign,
  CreditCard,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  History,
  RefreshCw,
} from 'lucide-react'
import {
  useBookingTransactions,
  useCustomerPaymentMethods,
  useStripeConnectStatus,
  type PaymentTransaction,
} from '../hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChargeDialog } from './charge-dialog'
import { RefundDialog } from './refund-dialog'
import { PaymentHistoryDialog } from './payment-history-dialog'

type BookingPaymentSectionProps = {
  bookingId: string
  customerId: string
  totalPriceCents: number
  amountPaidCents: number
  paymentStatus: string
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

const paymentStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  unpaid: { label: 'Unpaid', variant: 'secondary' },
  deposit_paid: { label: 'Deposit Paid', variant: 'warning' },
  fully_paid: { label: 'Paid', variant: 'success' },
  refunded: { label: 'Refunded', variant: 'secondary' },
  partially_refunded: { label: 'Partial Refund', variant: 'warning' },
  payment_failed: { label: 'Payment Failed', variant: 'destructive' },
}

export function BookingPaymentSection({
  bookingId,
  customerId,
  totalPriceCents,
  amountPaidCents,
  paymentStatus,
}: BookingPaymentSectionProps) {
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const { data: connectStatus } = useStripeConnectStatus()
  const { data: transactions } = useBookingTransactions(bookingId)
  const { data: paymentMethods } = useCustomerPaymentMethods(customerId)

  const hasPaymentMethod = paymentMethods && paymentMethods.length > 0
  const canCharge = connectStatus?.chargesEnabled && hasPaymentMethod && amountPaidCents < totalPriceCents
  const canRefund = connectStatus?.chargesEnabled && amountPaidCents > 0
  const amountDue = Math.max(0, totalPriceCents - amountPaidCents)

  const statusConfig = paymentStatusConfig[paymentStatus] || paymentStatusConfig.unpaid

  // Find the most recent failed transaction for error display
  const failedTransaction = transactions?.find(t => t.status === 'failed')

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Payment
            </CardTitle>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Status Display */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatPrice(totalPriceCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className={amountPaidCents > 0 ? 'text-success font-medium' : ''}>
                {formatPrice(amountPaidCents)}
              </span>
            </div>
            {amountDue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due</span>
                <span className="font-medium">{formatPrice(amountDue)}</span>
              </div>
            )}
          </div>

          {/* Payment Failed Alert */}
          {paymentStatus === 'payment_failed' && failedTransaction && (
            <>
              <Separator />
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Payment Failed</p>
                  <p className="text-sm text-destructive/80">
                    {failedTransaction.failure_reason || 'The payment could not be processed'}
                  </p>
                  <p className="text-xs text-destructive/60 mt-1">
                    {format(new Date(failedTransaction.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* No Stripe Setup Warning */}
          {!connectStatus?.chargesEnabled && (
            <>
              <Separator />
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Payments Not Configured</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your Stripe account in Settings to accept payments.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* No Payment Method Warning */}
          {connectStatus?.chargesEnabled && !hasPaymentMethod && (
            <>
              <Separator />
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">No Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    This customer has no card on file. Add a card from the customer profile.
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {canCharge && paymentStatus !== 'payment_failed' && (
              <Button size="sm" onClick={() => setChargeDialogOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Charge Card
              </Button>
            )}

            {paymentStatus === 'payment_failed' && canCharge && (
              <Button size="sm" onClick={() => setChargeDialogOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Payment
              </Button>
            )}

            {canRefund && (
              <Button size="sm" variant="outline" onClick={() => setRefundDialogOpen(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Refund
              </Button>
            )}

            {transactions && transactions.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setHistoryDialogOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                History ({transactions.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChargeDialog
        open={chargeDialogOpen}
        onOpenChange={setChargeDialogOpen}
        bookingId={bookingId}
        customerId={customerId}
        amountDueCents={amountDue}
        totalPriceCents={totalPriceCents}
      />

      <RefundDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        bookingId={bookingId}
        amountPaidCents={amountPaidCents}
      />

      <PaymentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        bookingId={bookingId}
      />
    </>
  )
}
