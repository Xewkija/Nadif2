import Link from 'next/link'
import { Sparkles, Circle, CheckCircle2, ArrowRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Step = {
  id: string
  title: string
  description: string
  href: string
  complete: boolean
}

const steps: Step[] = [
  {
    id: 'services',
    title: 'Add your first service',
    description: 'Define what cleaning services you offer',
    href: '/app/services/new',
    complete: false,
  },
  {
    id: 'customers',
    title: 'Add your first customer',
    description: 'Start building your customer base',
    href: '/app/customers/new',
    complete: false,
  },
  {
    id: 'bookings',
    title: 'Create your first booking',
    description: 'Schedule a cleaning for a customer',
    href: '/app/bookings/new',
    complete: false,
  },
]

export function GettingStartedCard() {
  return (
    <Card className="bg-amber-50/50 border-amber-200/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Getting Started</CardTitle>
            <CardDescription>
              Complete these steps to start booking cleanings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className="group flex items-start gap-3 rounded-lg border border-amber-200/60 bg-white p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/30"
          >
            <div className="mt-0.5">
              {step.complete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground group-hover:text-amber-700">
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
