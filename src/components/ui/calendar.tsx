'use client'

import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { subDays, format } from 'date-fns'

interface CalendarProps {
  mode?: 'range' | 'single'
  selected?: any
  onSelect?: (range: any) => void
  defaultMonth?: Date
  numberOfMonths?: number
}

export function Calendar({ mode, selected, onSelect, ...props }: CalendarProps) {
  const presets = [
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 14 days', value: 14 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 }
  ]

  const handlePresetSelect = (days: number) => {
    const to = new Date()
    const from = subDays(to, days)
    onSelect?.({ from, to })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-medium">Select Date Range</div>
      <div className="space-y-2">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant="outline"
            className="w-full justify-start"
            onClick={() => handlePresetSelect(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}