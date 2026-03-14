'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Filter, Search, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NotificationCard } from '@/components/notifications/notification-card'
import { useWebSocket } from '@/contexts/websocket-context'
import { NotificationWithRelations, NotificationType, NotificationPriority, NotificationStats } from '@/types'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'

// TODO: Replace with actual user context
const CURRENT_AGENT_ID = 1

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationWithRelations[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | 'all'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)

  const { 
    onNotificationCreated, 
    onNotificationUpdated, 
    onNotificationDeleted,
    emitNotificationRead,
    emitNotificationsReadAll 
  } = useWebSocket()

  // Load notifications with pagination and filters
  const loadNotifications = useCallback(async (resetPage = false) => {
    setIsLoading(true)
    try {
      const currentPage = resetPage ? 1 : page
      const params = new URLSearchParams({
        recipientId: CURRENT_AGENT_ID.toString(),
        page: currentPage.toString(),
        limit: '50',
      })

      if (readFilter !== 'all') {
        params.append('unreadOnly', readFilter === 'unread' ? 'true' : 'false')
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }

      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (resetPage) {
          setNotifications(data.notifications || [])
          setPage(1)
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])])
        }
        setHasNextPage(data.pagination?.hasNextPage || false)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, readFilter, typeFilter, priorityFilter])

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/stats?recipientId=${CURRENT_AGENT_ID}`)
      if (response.ok) {
        const statsData = await response.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading notification stats:', error)
    }
  }, [])

  // Filter notifications locally based on search
  useEffect(() => {
    let filtered = notifications

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = notifications.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.task?.title.toLowerCase().includes(query) ||
        n.project?.name.toLowerCase().includes(query)
      )
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchQuery])

  // Handle filter changes
  useEffect(() => {
    loadNotifications(true)
  }, [typeFilter, priorityFilter, readFilter])

  // Load initial data
  useEffect(() => {
    loadNotifications(true)
    loadStats()
  }, [])

  // Handle real-time updates
  useEffect(() => {
    const unsubscribeCreated = onNotificationCreated((notification) => {
      if (notification.recipientId === CURRENT_AGENT_ID) {
        setNotifications(prev => [notification, ...prev])
        loadStats()
      }
    })

    const unsubscribeUpdated = onNotificationUpdated((notification) => {
      if (notification.recipientId === CURRENT_AGENT_ID) {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? notification : n)
        )
        loadStats()
      }
    })

    const unsubscribeDeleted = onNotificationDeleted((notificationId) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadStats()
    })

    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
    }
  }, [onNotificationCreated, onNotificationUpdated, onNotificationDeleted, loadStats])

  // Handle notification click
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
          emitNotificationRead(notification.id)
          setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
          )
          loadStats()
        }
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
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
        body: JSON.stringify({ recipientId: CURRENT_AGENT_ID }),
      })

      if (response.ok) {
        emitNotificationsReadAll(CURRENT_AGENT_ID)
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        loadStats()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [emitNotificationsReadAll, loadStats])

  // Group notifications by date
  const groupedNotifications = React.useMemo(() => {
    const groups: Record<string, NotificationWithRelations[]> = {}
    
    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt)
      let groupKey: string
      
      if (isToday(date)) {
        groupKey = 'Today'
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday'
      } else if (isThisWeek(date)) {
        groupKey = 'This Week'
      } else {
        groupKey = 'Older'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(notification)
    })
    
    return groups
  }, [filteredNotifications])

  const unreadCount = stats?.unreadCount || 0

  return (
    <div className="container max-w-4xl mx-auto p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center space-x-4 mb-6">
          <Badge variant="outline">
            Total: {stats.totalCount}
          </Badge>
          <Badge variant={unreadCount > 0 ? "destructive" : "outline"}>
            Unread: {unreadCount}
          </Badge>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={readFilter} onValueChange={(value: any) => setReadFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task_assigned">Task Assigned</SelectItem>
              <SelectItem value="task_status_changed">Status Changed</SelectItem>
              <SelectItem value="comment_added">Comments</SelectItem>
              <SelectItem value="project_updated">Project Updates</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications */}
      {isLoading && notifications.length === 0 ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50">
                <div className="h-8 w-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
          <p className="text-muted-foreground">
            {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'You\'re all caught up!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
            <div key={groupName}>
              <h2 className="text-lg font-semibold mb-3">{groupName}</h2>
              <div className="space-y-2">
                {groupNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    showActions
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasNextPage && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPage(prev => prev + 1)
                  loadNotifications()
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}