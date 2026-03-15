'use client'

import { useState } from 'react'
import { CreditCard, Plus, Trash2, Check } from 'lucide-react'
import {
  useCustomerPaymentMethods,
  useRemovePaymentMethod,
  type PaymentMethod,
} from '../hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const cardBrandLogos: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

type PaymentMethodsListProps = {
  customerId: string
  onAddCard?: () => void
  compact?: boolean
}

export function PaymentMethodsList({
  customerId,
  onAddCard,
  compact = false,
}: PaymentMethodsListProps) {
  const { data: methods, isLoading, error } = useCustomerPaymentMethods(customerId)
  const removeMutation = useRemovePaymentMethod()

  const [deleteMethod, setDeleteMethod] = useState<PaymentMethod | null>(null)

  const handleDelete = async () => {
    if (!deleteMethod) return
    await removeMutation.mutateAsync({
      paymentMethodId: deleteMethod.id,
      customerId,
    })
    setDeleteMethod(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-4">
        Failed to load payment methods
      </div>
    )
  }

  if (!methods || methods.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className={compact ? 'p-4' : 'p-6'}>
          <div className="flex flex-col items-center text-center gap-3">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No payment methods</p>
              <p className="text-sm text-muted-foreground">
                Add a card to enable payments
              </p>
            </div>
            {onAddCard && (
              <Button variant="outline" size="sm" onClick={onAddCard}>
                <Plus className="mr-2 h-4 w-4" />
                Add Card
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <Card key={method.id} className={method.is_default ? 'ring-1 ring-primary' : ''}>
          <CardContent className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-14 bg-muted rounded flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {cardBrandLogos[method.card_brand] ?? method.card_brand}
                  </span>
                  <span className="text-muted-foreground">
                    **** {method.card_last_four}
                  </span>
                  {method.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Expires {method.card_exp_month}/{method.card_exp_year}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteMethod(method)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove card</span>
            </Button>
          </CardContent>
        </Card>
      ))}

      {onAddCard && (
        <Button variant="outline" className="w-full" onClick={onAddCard}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMethod} onOpenChange={() => setDeleteMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {cardBrandLogos[deleteMethod?.card_brand ?? ''] ?? deleteMethod?.card_brand} card ending in {deleteMethod?.card_last_four}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
