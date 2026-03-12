'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, Smartphone, BellOff } from 'lucide-react'
import { useNotificationPreferences } from '@/hooks/use-preference-hooks'

interface NotificationPreferencesProps {
  className?: string
}

export function NotificationPreferencesPanel({ className }: NotificationPreferencesProps) {
  const { preferences, updatePreferences, resetToDefaults, isLoading } = useNotificationPreferences()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master toggle for all notification types
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={preferences.enabled}
              onCheckedChange={(checked) => 
                updatePreferences({ enabled: checked })
              }
              disabled={isLoading}
            />
          </div>

          {preferences.enabled && (
            <>
              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <Label className="text-base font-medium">Email Notifications</Label>
                </div>
                
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-task-assigned">Task Assignments</Label>
                      <p className="text-xs text-muted-foreground">When tasks are assigned to you</p>
                    </div>
                    <Switch
                      id="email-task-assigned"
                      checked={preferences.email.taskAssigned}
                      onCheckedChange={(checked) => 
                        updatePreferences({ 
                          email: { ...preferences.email, taskAssigned: checked }
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-task-updates">Task Updates</Label>
                      <p className="text-xs text-muted-foreground">Status changes and comments</p>
                    </div>
                    <Switch
                      id="email-task-updates"
                      checked={preferences.email.taskUpdates}
                      onCheckedChange={(checked) => 
                        updatePreferences({ 
                          email: { ...preferences.email, taskUpdates: checked }
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-mentions">Mentions</Label>
                      <p className="text-xs text-muted-foreground">When you're mentioned in comments</p>
                    </div>
                    <Switch
                      id="email-mentions"
                      checked={preferences.email.mentions}
                      onCheckedChange={(checked) => 
                        updatePreferences({ 
                          email: { ...preferences.email, mentions: checked }
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-frequency">Email Frequency</Label>
                    <Select
                      value={preferences.email.frequency}
                      onValueChange={(value) => 
                        updatePreferences({ 
                          email: { ...preferences.email, frequency: value as any }
                        })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <Label className="text-base font-medium">Push Notifications</Label>
                  <Badge variant="secondary" className="text-xs">Browser</Badge>
                </div>
                
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Real-time browser notifications</p>
                    </div>
                    <Switch
                      id="push-enabled"
                      checked={preferences.push.enabled}
                      onCheckedChange={(checked) => 
                        updatePreferences({ 
                          push: { ...preferences.push, enabled: checked }
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  {preferences.push.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-task-updates">Task Updates</Label>
                          <p className="text-xs text-muted-foreground">Status changes and assignments</p>
                        </div>
                        <Switch
                          id="push-task-updates"
                          checked={preferences.push.taskUpdates}
                          onCheckedChange={(checked) => 
                            updatePreferences({ 
                              push: { ...preferences.push, taskUpdates: checked }
                            })
                          }
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-mentions">Mentions</Label>
                          <p className="text-xs text-muted-foreground">When mentioned in comments</p>
                        </div>
                        <Switch
                          id="push-mentions"
                          checked={preferences.push.mentions}
                          onCheckedChange={(checked) => 
                            updatePreferences({ 
                              push: { ...preferences.push, mentions: checked }
                            })
                          }
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* In-App Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BellOff className="w-4 h-4" />
                  <Label className="text-base font-medium">In-App Notifications</Label>
                </div>
                
                <div className="ml-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inapp-sound">Sound Effects</Label>
                      <p className="text-xs text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch
                      id="inapp-sound"
                      checked={preferences.inApp.sound}
                      onCheckedChange={(checked) => 
                        updatePreferences({ 
                          inApp: { ...preferences.inApp, sound: checked }
                        })
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inapp-position">Notification Position</Label>
                    <Select
                      value={preferences.inApp.position}
                      onValueChange={(value) => 
                        updatePreferences({ 
                          inApp: { ...preferences.inApp, position: value as any }
                        })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={isLoading}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}