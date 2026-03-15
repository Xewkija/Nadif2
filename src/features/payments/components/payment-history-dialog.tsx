'use client'

import { format } from 'date-fns'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useBookingTransactions, type PaymentTransaction } from '../hooks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type PaymentHistoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

const transactionTypeConfig = {
  charge: {
    label: 'Charge',
    icon: ArrowDownCircle,
    colorClass: 'text-success',
  },
  deposit: {
    label: 'Deposit',
    icon: ArrowDownCircle,
    colorClass: 'text-success',
  },
  refund: {
    label: 'Refund',
    icon: ArrowUpCircle,
    colorClass: 'text-destructive',
  },
  void: {
    label: 'Void',
    icon: XCircle,
    colorClass: 'text-muted-foreground',
  },
}

const statusConfig = {
  succeeded: {
    label: 'Succeeded',
    variant: 'success' as const,
    icon: CheckCircle,
  },
  pending: {
    label: 'Pending',
    variant: 'warning' as const,
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    variant: 'destructive' as const,
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary' as const,
    icon: XCircle,
  },
}

function TransactionRow({ transaction }: { transaction: PaymentTransaction }) {
  const typeConfig = transactionTypeConfig[transaction.transaction_type]
  const statusCfg = statusConfig[transaction.status]
  const TypeIcon = typeConfig.icon
  const StatusIcon = statusCfg.icon

  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <div className={`mt-0.5 ${typeConfig.colorClass}`}>
        <TypeIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{typeConfig.label}</span>
          <Badge variant={statusCfg.variant} className="text-xs">
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusCfg.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
        </p>
        {transaction.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {transaction.description}
          </p>
        )}
        {transaction.failure_reason && (
          <div className="flex items-start gap-2 mt-2 p-2 bg-destructive/10 rounded text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <span className="text-destructive">{transaction.failure_reason}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <span className={`font-medium ${
          transaction.transaction_type === 'refund' ? 'text-destructive' : 'text-success'
        }`}>
          {transaction.transaction_type === 'refund' ? '-' : '+'}
          {formatPrice(transaction.amount_cents)}
        </span>
      </div>
    </div>
  )
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  bookingId,
}: PaymentHistoryDialogProps) {
  const { data: transactions, isLoading, error } = useBookingTransactions(bookingId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-destructive">
              Failed to load payment history
            </div>
          )}

          {transactions && transactions.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No payment transactions yet
            </div>
          )}

          {transactions && transactions.length > 0 && (
            <div className="divide-y">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
