'use client'

import { useState } from 'react'
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react'
import {
  useCreatePaymentIntent,
  useCustomerPaymentMethods,
} from '../hooks'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

type ChargeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  customerId: string
  amountDueCents: number
  totalPriceCents: number
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

const cardBrandLabels: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
}

export function ChargeDialog({
  open,
  onOpenChange,
  bookingId,
  customerId,
  amountDueCents,
  totalPriceCents,
}: ChargeDialogProps) {
  const [amountDollars, setAmountDollars] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const { data: paymentMethods } = useCustomerPaymentMethods(customerId)
  const chargeMutation = useCreatePaymentIntent()

  // Set defaults when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setAmountDollars((amountDueCents / 100).toFixed(2))
      setError(null)
      // Select default payment method
      const defaultMethod = paymentMethods?.find(m => m.is_default) || paymentMethods?.[0]
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.stripe_payment_method_id)
      }
    }
    onOpenChange(newOpen)
  }

  const handleCharge = async () => {
    setError(null)

    const amountCents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(amountCents) || amountCents < 50) {
      setError('Minimum charge amount is $0.50')
      return
    }

    if (amountCents > amountDueCents) {
      setError(`Amount exceeds remaining balance of ${formatPrice(amountDueCents)}`)
      return
    }

    try {
      await chargeMutation.mutateAsync({
        bookingId,
        amountCents,
        paymentMethodId: selectedPaymentMethod || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to charge card')
    }
  }

  const amountCents = Math.round(parseFloat(amountDollars || '0') * 100)
  const isValidAmount = !isNaN(amountCents) && amountCents >= 50 && amountCents <= amountDueCents

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Charge Card</DialogTitle>
          <DialogDescription>
            Charge the customer's card for this booking. Amount due: {formatPrice(amountDueCents)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Method Selection */}
          {paymentMethods && paymentMethods.length > 1 && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem
                      key={method.stripe_payment_method_id}
                      value={method.stripe_payment_method_id}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {cardBrandLabels[method.card_brand] || method.card_brand} ****{method.card_last_four}
                        </span>
                        {method.is_default && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                min="0.50"
                step="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmountDollars((amountDueCents / 100).toFixed(2))}
              >
                Full Amount ({formatPrice(amountDueCents)})
              </Button>
              {amountDueCents !== totalPriceCents && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountDollars((totalPriceCents * 0.25 / 100).toFixed(2))}
                >
                  25% Deposit
                </Button>
              )}
            </div>
          </div>

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
            disabled={chargeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCharge}
            disabled={!isValidAmount || chargeMutation.isPending}
          >
            {chargeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Charge {isValidAmount ? formatPrice(amountCents) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
