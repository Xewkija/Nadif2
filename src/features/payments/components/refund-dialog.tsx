'use client'

import { useState } from 'react'
import { RotateCcw, AlertCircle, Loader2 } from 'lucide-react'
import { useProcessRefund } from '../hooks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

type RefundDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  amountPaidCents: number
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function RefundDialog({
  open,
  onOpenChange,
  bookingId,
  amountPaidCents,
}: RefundDialogProps) {
  const [amountDollars, setAmountDollars] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refundMutation = useProcessRefund()

  // Set defaults when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setAmountDollars((amountPaidCents / 100).toFixed(2))
      setReason('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const handleRefund = async () => {
    setError(null)

    const amountCents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Please enter a valid refund amount')
      return
    }

    if (amountCents > amountPaidCents) {
      setError(`Cannot refund more than ${formatPrice(amountPaidCents)}`)
      return
    }

    try {
      await refundMutation.mutateAsync({
        bookingId,
        amountCents,
        reason: reason.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund')
    }
  }

  const amountCents = Math.round(parseFloat(amountDollars || '0') * 100)
  const isValidAmount = !isNaN(amountCents) && amountCents > 0 && amountCents <= amountPaidCents
  const isPartialRefund = amountCents < amountPaidCents

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund payment to the customer. Total paid: {formatPrice(amountPaidCents)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="refund-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmountDollars((amountPaidCents / 100).toFixed(2))}
            >
              Full Refund ({formatPrice(amountPaidCents)})
            </Button>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason (optional)</Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for refund..."
              rows={2}
            />
          </div>

          {/* Partial Refund Warning */}
          {isPartialRefund && isValidAmount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a partial refund. {formatPrice(amountPaidCents - amountCents)} will remain on the booking.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={refundMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={!isValidAmount || refundMutation.isPending}
          >
            {refundMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Refund {isValidAmount ? formatPrice(amountCents) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
