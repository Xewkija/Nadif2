'use client'

import { useState } from 'react'
import { format, addDays, startOfToday, isBefore, isWeekend } from 'date-fns'
import { Calendar as CalendarIcon, Clock, Sun, CloudSun, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useWizard } from '../wizard-context'
import { PricingSummary } from '../pricing-summary'
import type { TimeWindowCode } from '@/types/database'

const timeWindowOptions: { value: TimeWindowCode; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'morning', label: 'Morning', icon: Sun, description: '8:00 AM - 12:00 PM' },
  { value: 'afternoon', label: 'Afternoon', icon: CloudSun, description: '12:00 PM - 5:00 PM' },
  { value: 'anytime', label: 'Anytime', icon: CalendarDays, description: 'Flexible timing' },
  { value: 'specific', label: 'Specific Time', icon: Clock, description: 'Choose exact time' },
]

export function StepSchedule() {
  const { state, actions } = useWizard()
  const { data } = state
  const [calendarOpen, setCalendarOpen] = useState(false)

  const today = startOfToday()
  const minDate = addDays(today, 1) // At least 1 day lead time

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      actions.setSchedule(
        format(date, 'yyyy-MM-dd'),
        data.scheduledTimeWindow,
        data.scheduledTimeStart
      )
      setCalendarOpen(false)
    }
  }

  const handleTimeWindowChange = (value: TimeWindowCode) => {
    actions.setSchedule(
      data.scheduledDate,
      value,
      value === 'specific' ? data.scheduledTimeStart : null
    )
  }

  const handleTimeChange = (time: string) => {
    actions.setSchedule(data.scheduledDate, data.scheduledTimeWindow, time)
  }

  const handleNotesChange = (notes: string) => {
    actions.setCustomerNotes(notes)
  }

  // Quick date options
  const quickDates = [
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'In 2 days', date: addDays(today, 2) },
    { label: 'Next week', date: addDays(today, 7) },
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Date Selection */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Select Date
          </h3>

          {/* Quick date buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quickDates.map((option) => (
              <Button
                key={option.label}
                variant={
                  data.scheduledDate === format(option.date, 'yyyy-MM-dd')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => handleDateSelect(option.date)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Calendar picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !data.scheduledDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.scheduledDate
                  ? format(new Date(data.scheduledDate), 'EEEE, MMMM d, yyyy')
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.scheduledDate ? new Date(data.scheduledDate) : undefined}
                onSelect={handleDateSelect}
                disabled={(date) => isBefore(date, minDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {data.scheduledDate && isWeekend(new Date(data.scheduledDate)) && (
            <p className="text-sm text-amber-600 mt-2">
              Note: Weekend rates may apply
            </p>
          )}
        </div>

        <Separator />

        {/* Time Window Selection */}
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Preferred Time
          </h3>

          <RadioGroup
            value={data.scheduledTimeWindow ?? ''}
            onValueChange={(value) => handleTimeWindowChange(value as TimeWindowCode)}
            className="grid sm:grid-cols-2 gap-3"
          >
            {timeWindowOptions.map((option) => {
              const Icon = option.icon
              return (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={`time-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`time-${option.value}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                      'hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>

          {/* Specific time input */}
          {data.scheduledTimeWindow === 'specific' && (
            <div className="mt-4">
              <Label htmlFor="specific-time">Exact Time</Label>
              <Input
                id="specific-time"
                type="time"
                value={data.scheduledTimeStart ?? ''}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="mt-1.5 w-40"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Customer Notes */}
        <div>
          <Label htmlFor="customer-notes">Special Instructions (Optional)</Label>
          <Textarea
            id="customer-notes"
            placeholder="Enter any special instructions, access codes, or notes for this booking..."
            value={data.customerNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="mt-1.5"
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            These notes will be visible to the service provider
          </p>
        </div>

        {/* Recurring notice */}
        {data.frequency !== 'onetime' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                <strong>Recurring Service:</strong> This {data.frequency} service will be
                scheduled starting on{' '}
                {data.scheduledDate
                  ? format(new Date(data.scheduledDate), 'MMMM d, yyyy')
                  : 'the selected date'}
                . Future occurrences will be automatically created.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pricing Summary - Desktop sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <PricingSummary />
        </div>
      </div>
    </div>
  )
}
