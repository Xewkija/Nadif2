'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useWizard } from './wizard-context'

type PricingItem = {
  label: string
  amount: number
  type: 'base' | 'addon' | 'adjustment'
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

type PricingSummaryProps = {
  compact?: boolean
}

export function PricingSummary({ compact = false }: PricingSummaryProps) {
  const { state } = useWizard()
  const { data } = state
  const [pricing, setPricing] = useState<{
    items: PricingItem[]
    total: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (data.serviceId) {
      calculatePricing()
    } else {
      setPricing(null)
    }
  }, [data.serviceId, data.selectedAddOnIds, data.propertyId, data.frequency])

  const calculatePricing = async () => {
    if (!data.serviceId) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Get service base price
      const { data: service } = await supabase
        .from('services')
        .select('base_price_cents, name')
        .eq('id', data.serviceId)
        .single()

      if (!service) {
        setIsLoading(false)
        return
      }

      const items: PricingItem[] = [
        {
          label: service.name,
          amount: service.base_price_cents,
          type: 'base',
        },
      ]

      // Add add-on prices
      if (data.selectedAddOnIds.length > 0) {
        const { data: addOns } = await supabase
          .from('add_ons')
          .select('id, name, price_cents')
          .in('id', data.selectedAddOnIds)

        if (addOns) {
          for (const addOn of addOns) {
            items.push({
              label: addOn.name,
              amount: addOn.price_cents,
              type: 'addon',
            })
          }
        }
      }

      // Calculate total
      const total = items.reduce((sum, item) => sum + item.amount, 0)

      setPricing({ items, total })
    } catch (error) {
      console.error('Failed to calculate pricing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!data.serviceId) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : pricing ? (
          <span className="text-lg font-semibold">{formatPrice(pricing.total)}</span>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Price Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pricing ? (
          <div className="space-y-2">
            {pricing.items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between',
                  item.type === 'addon' && 'text-sm text-muted-foreground'
                )}
              >
                <span>{item.label}</span>
                <span>{formatPrice(item.amount)}</span>
              </div>
            ))}

            <Separator className="my-3" />

            <div className="flex items-center justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(pricing.total)}</span>
            </div>

            {data.frequency !== 'onetime' && (
              <p className="text-xs text-muted-foreground mt-2">
                This price applies to each occurrence of the recurring service.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a service to see pricing
          </p>
        )}
      </CardContent>
    </Card>
  )
}
