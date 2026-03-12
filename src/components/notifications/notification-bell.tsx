'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { NotificationsList } from './notifications-list'
import { useWebSocket } from '@/contexts/websocket-context'
import { NotificationWithRelations, NotificationStats } from '@/types'

interface NotificationBellProps {
  agentId: number
  className?: string
}

export function NotificationBell({ agentId, className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { 
    onNotificationCreated, 
    onNotificationUpdated, 
    onNotificationDeleted,
    emitNotificationRead,
    emitNotificationsReadAll 
  } = useWebSocket()

  // Load notification stats
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/stats?recipientId=${agentId}`)
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading notification stats:', error)
    }
  }, [agentId])

  // Load recent notifications
  const loadNotifications = useCallback(async () => {
    if (!isOpen) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/notifications?recipientId=${agentId}&limit=20&page=1`
      )
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, isOpen])

  // Handle real-time notification events
  useEffect(() => {
    const unsubscribeCreated = onNotificationCreated((notification) => {
      // Only handle notifications for this agent
      if (notification.recipientId === agentId) {
        setNotifications(prev => [notification, ...prev].slice(0, 20))
        loadStats() // Refresh stats
      }
    })

    const unsubscribeUpdated = onNotificationUpdated((notification) => {
      if (notification.recipientId === agentId) {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? notification : n)
        )
        loadStats() // Refresh stats
      }
    })

    const unsubscribeDeleted = onNotificationDeleted((notificationId) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadStats() // Refresh stats
    })

    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [agentId, onNotificationCreated, onNotificationUpdated, onNotificationDeleted, loadStats])

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  // Handle notification click (mark as read)
  const handleNotificationClick = useCallback(async (notification: NotificationWithRelations) => {
    if (!notification.isRead) {
      try {
        const response = await fetch(`/api/notifications/${notification.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isRead: true }),
        })

        if (response.ok) {
          // Emit real-time update
          emitNotificationRead(notification.id)
          
          // Update local state
          setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
          )
          loadStats()
        }
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
      setIsOpen(false)
    }
  }, [emitNotificationRead, loadStats])

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientId: agentId }),
      })

      if (response.ok) {
        // Emit real-time update
        emitNotificationsReadAll(agentId)
        
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        loadStats()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [agentId, emitNotificationsReadAll, loadStats])

  const unreadCount = stats?.unreadCount || 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <NotificationsList
          notifications={notifications}
          isLoading={isLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={handleMarkAllAsRead}
          onViewAll={() => {
            window.location.href = '/notifications'
            setIsOpen(false)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}