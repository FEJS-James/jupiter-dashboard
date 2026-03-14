'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, Clock, Moon, Info } from 'lucide-react'
import { useNotificationPreferences } from '@/hooks/use-preference-hooks'
import type { NotificationFrequency } from '@/types'

interface NotificationPreferencesProps {
  className?: string
}

const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string; description: string }[] = [
  { value: 'immediate', label: 'Immediate', description: 'Get notified right away' },
  { value: 'batched', label: 'Batched', description: 'Grouped notifications at intervals' },
  { value: 'digest', label: 'Digest', description: 'Periodic summary of all notifications' },
]

export function NotificationPreferencesPanel({ className }: NotificationPreferencesProps) {
  const {
    notificationFrequency,
    quietHoursStart,
    quietHoursEnd,
    quietHoursEnabled,
    isQuietHoursActive,
    setNotificationFrequency,
    setQuietHoursStart,
    setQuietHoursEnd,
    setQuietHoursEnabled,
  } = useNotificationPreferences()

  return (
    <div className={className} role="region" aria-label="Notification preferences">
      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden="true" />
            Notification Frequency
          </CardTitle>
          <CardDescription>
            Control how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="notification-frequency">Delivery Frequency</Label>
            <Select
              value={notificationFrequency}
              onValueChange={(value) => setNotificationFrequency(value as NotificationFrequency)}
            >
              <SelectTrigger id="notification-frequency" aria-label="Notification delivery frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {notificationFrequency === 'immediate' && 'You will receive notifications as soon as events occur.'}
              {notificationFrequency === 'batched' && 'Notifications will be grouped and delivered at regular intervals.'}
              {notificationFrequency === 'digest' && 'You will receive a periodic digest summarizing all notifications.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" aria-hidden="true" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours-enabled" className="text-base font-medium">
                Enable Quiet Hours
              </Label>
              <p id="quiet-hours-desc" className="text-sm text-muted-foreground">
                Suppress notifications during the specified time window
              </p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
              aria-describedby="quiet-hours-desc"
            />
          </div>

          {quietHoursEnabled && (
            <div className="space-y-4" role="group" aria-label="Quiet hours time range">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-hours-start">
                    <Clock className="inline w-4 h-4 mr-1" aria-hidden="true" />
                    Start Time
                  </Label>
                  <Input
                    id="quiet-hours-start"
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    aria-label="Quiet hours start time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-hours-end">
                    <Clock className="inline w-4 h-4 mr-1" aria-hidden="true" />
                    End Time
                  </Label>
                  <Input
                    id="quiet-hours-end"
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    aria-label="Quiet hours end time"
                  />
                </div>
              </div>

              {isQuietHoursActive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg" role="status" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-amber-600" aria-hidden="true" />
                    <span className="font-medium text-amber-800">Quiet Hours Active</span>
                    <Badge variant="outline" className="text-amber-700">
                      {quietHoursStart} – {quietHoursEnd}
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Notifications are currently paused and will resume after quiet hours end.
                  </p>
                </div>
              )}

              {!isQuietHoursActive && (
                <div className="text-sm text-muted-foreground">
                  Quiet hours are scheduled from <strong>{quietHoursStart}</strong> to <strong>{quietHoursEnd}</strong>.
                  Notifications will be paused during this window.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Notification Summary</CardTitle>
          <CardDescription>
            Overview of your notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list" aria-label="Notification settings summary">
            <div className="flex items-center justify-between" role="listitem">
              <span className="text-sm">Delivery Frequency</span>
              <Badge variant="outline" className="capitalize">{notificationFrequency}</Badge>
            </div>
            <div className="flex items-center justify-between" role="listitem">
              <span className="text-sm">Quiet Hours</span>
              <Badge variant={quietHoursEnabled ? 'default' : 'secondary'}>
                {quietHoursEnabled ? `${quietHoursStart} – ${quietHoursEnd}` : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
