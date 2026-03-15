'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Settings,
  ClipboardList,
  Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Bookings', href: '/app/bookings', icon: ClipboardList },
  { name: 'Recurring', href: '/app/recurring', icon: Repeat },
  { name: 'Customers', href: '/app/customers', icon: Users },
  { name: 'Services', href: '/app/services', icon: Sparkles },
  { name: 'Calendar', href: '/app/calendar', icon: Calendar },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive =
          item.href === '/app'
            ? pathname === '/app'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
