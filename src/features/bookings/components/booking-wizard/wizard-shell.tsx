'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWizard } from './wizard-context'
import { WIZARD_STEPS, STEP_LABELS, type WizardStep } from './types'
import { StepCustomer } from './steps/step-customer'
import { StepService } from './steps/step-service'
import { StepSchedule } from './steps/step-schedule'
import { StepReview } from './steps/step-review'
import { PricingSummary } from './pricing-summary'

type WizardShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WizardShell({ open, onOpenChange }: WizardShellProps) {
  const router = useRouter()
  const { state, actions } = useWizard()
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (state.hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onOpenChange(false)
      actions.reset()
    }
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    onOpenChange(false)
    actions.reset()
  }

  const handleCancelClose = () => {
    setShowUnsavedWarning(false)
  }

  // Handle successful quote send or confirm
  const handleSuccess = () => {
    onOpenChange(false)
    actions.reset()
    router.push('/app/bookings')
  }

  // Validate step completion
  const isStepComplete = (step: WizardStep): boolean => {
    const { data } = state
    switch (step) {
      case 'customer':
        return !!data.customerId && !!data.propertyId
      case 'service':
        return !!data.serviceId
      case 'schedule':
        return !!data.scheduledDate
      case 'review':
        return true
      default:
        return false
    }
  }

  const canNavigateToStep = (step: WizardStep): boolean => {
    const stepIndex = WIZARD_STEPS.indexOf(step)
    // Can always go back
    if (stepIndex <= WIZARD_STEPS.indexOf(state.currentStep)) return true
    // Can only go forward if all previous steps are complete
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(WIZARD_STEPS[i])) return false
    }
    return true
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 'customer':
        return <StepCustomer />
      case 'service':
        return <StepService />
      case 'schedule':
        return <StepSchedule />
      case 'review':
        return <StepReview onSuccess={handleSuccess} />
      default:
        return null
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[640px] lg:max-w-[720px] p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold">
                {state.bookingId ? 'Edit Booking' : 'New Booking'}
              </SheetTitle>
              <div className="flex items-center gap-2">
                {state.isSaving && (
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Saving...
                  </span>
                )}
                {state.lastSavedAt && !state.isSaving && !state.hasUnsavedChanges && (
                  <span className="flex items-center text-sm text-muted-foreground">
                    <Check className="h-3 w-3 mr-1 text-green-600" />
                    Saved
                  </span>
                )}
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mt-4">
              {WIZARD_STEPS.map((step, index) => {
                const isCurrent = step === state.currentStep
                const isComplete = isStepComplete(step)
                const canNavigate = canNavigateToStep(step)
                const isPast = WIZARD_STEPS.indexOf(step) < WIZARD_STEPS.indexOf(state.currentStep)

                return (
                  <button
                    key={step}
                    onClick={() => canNavigate && actions.setStep(step)}
                    disabled={!canNavigate}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      isCurrent && 'bg-primary text-primary-foreground',
                      !isCurrent && canNavigate && 'hover:bg-muted cursor-pointer',
                      !isCurrent && !canNavigate && 'text-muted-foreground cursor-not-allowed',
                      isPast && isComplete && 'text-green-600'
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                        isCurrent && 'bg-primary-foreground text-primary',
                        !isCurrent && 'bg-muted-foreground/20'
                      )}
                    >
                      {isPast && isComplete ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
                  </button>
                )
              })}
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {state.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderStep()
              )}
            </div>
          </div>

          {/* Pricing Summary - Sticky on mobile */}
          {state.data.serviceId && (
            <div className="lg:hidden border-t bg-background px-6 py-4 shrink-0">
              <PricingSummary compact />
            </div>
          )}

          {/* Footer with navigation */}
          <div className="border-t px-6 py-4 flex items-center justify-between shrink-0 bg-background">
            <Button
              variant="outline"
              onClick={actions.prevStep}
              disabled={state.currentStep === 'customer' || state.isSaving}
            >
              Back
            </Button>

            <div className="flex items-center gap-2">
              {state.currentStep !== 'review' ? (
                <Button
                  onClick={actions.nextStep}
                  disabled={!isStepComplete(state.currentStep) || state.isSaving}
                >
                  Continue
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved changes warning dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
            <p className="text-muted-foreground mb-4">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelClose}>
                Keep Editing
              </Button>
              <Button variant="destructive" onClick={handleConfirmClose}>
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
