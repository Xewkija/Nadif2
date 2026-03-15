'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  Building2,
  CreditCard,
  Shield,
  CheckCircle,
  Star,
} from 'lucide-react'

const settingsNav = [
  {
    name: 'Pricing Rules',
    href: '/app/settings/pricing',
    icon: DollarSign,
    description: 'Configure automatic pricing adjustments',
  },
  {
    name: 'Locations',
    href: '/app/settings/locations',
    icon: Building2,
    description: 'Manage service areas and locations',
  },
  {
    name: 'Payments',
    href: '/app/settings/payments',
    icon: CreditCard,
    description: 'Payment methods and policies',
  },
  {
    name: 'Approvals',
    href: '/app/settings/approvals',
    icon: Shield,
    description: 'Job approval requirements',
  },
  {
    name: 'Deep Clean',
    href: '/app/settings/deep-clean',
    icon: CheckCircle,
    description: 'Deep cleaning policies',
  },
  {
    name: 'Satisfaction',
    href: '/app/settings/satisfaction',
    icon: Star,
    description: 'Reclean and refund policies',
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex gap-8">
      {/* Settings sidebar */}
      <aside className="w-64 shrink-0">
        <nav className="space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  isActive
                    ? 'bg-muted'
                    : 'hover:bg-muted/50'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 mt-0.5 shrink-0',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                />
                <div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {item.name}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
