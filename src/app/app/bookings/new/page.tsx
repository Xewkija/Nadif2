'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { WizardProvider, WizardShell } from '@/features/bookings/components/booking-wizard'

export default function NewBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)

  const editBookingId = searchParams.get('edit')

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      router.push('/app/bookings')
    }
  }

  // Close and navigate back when pressing escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <WizardProvider bookingId={editBookingId}>
      <WizardShell open={open} onOpenChange={handleOpenChange} />
    </WizardProvider>
  )
}
