'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { name: 'Services', href: '/app/services' },
  { name: 'Add-ons', href: '/app/services/add-ons' },
]

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div>
      <nav className="mb-6 flex gap-6 border-b">
        {tabs.map((tab) => {
          const isActive = tab.href === '/app/services'
            ? pathname === '/app/services'
            : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'pb-3 text-sm font-medium transition-colors hover:text-foreground',
                isActive
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {tab.name}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
