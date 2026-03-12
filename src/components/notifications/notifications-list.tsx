'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { NotificationCard } from './notification-card'
import { NotificationWithRelations } from '@/types'
import { CheckCheck, Eye } from 'lucide-react'

interface NotificationsListProps {
  notifications: NotificationWithRelations[]
  isLoading: boolean
  onNotificationClick: (notification: NotificationWithRelations) => void
  onMarkAllAsRead: () => void
  onViewAll: () => void
}

export function NotificationsList({
  notifications,
  isLoading,
  onNotificationClick,
  onMarkAllAsRead,
  onViewAll,
}: NotificationsListProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>
      
      <Separator />

      {/* Notifications */}
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className="h-96">
          <div className="p-2">
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <NotificationCard
                  notification={notification}
                  onClick={() => onNotificationClick(notification)}
                />
                {index < notifications.length - 1 && <Separator className="my-1" />}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="w-full justify-center text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Bell({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}