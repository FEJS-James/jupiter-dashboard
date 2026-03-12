'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  MessageSquare, 
  Reply, 
  AtSign, 
  CheckCheck,
  Dot
} from 'lucide-react'
import { CommentNotification } from '@/types'
import { useWebSocket } from '@/contexts/websocket-context'
import { motion, AnimatePresence } from 'framer-motion'

interface NotificationBellProps {
  agentId: number
  className?: string
}

const notificationIcons = {
  mention: AtSign,
  reply: Reply,
  assigned: MessageSquare,
}

export function NotificationBell({
  agentId,
  className = ''
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<CommentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const { socket } = useWebSocket()
  
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/notifications?limit=20`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data.notifications)
          setUnreadCount(data.data.unreadCount)
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchNotifications()
  }, [agentId])
  
  // Listen for new comment notifications via WebSocket
  useEffect(() => {
    if (!socket) return
    
    const handleCommentAdded = (taskId: number, comment: any) => {
      // Check if this agent was mentioned or if it's a reply to their comment
      if (comment.mentions?.includes(agentId) || 
          (comment.parentId && notifications.some(n => n.commentId === comment.parentId && n.comment?.agent.id === agentId))) {
        fetchNotifications() // Refetch to get new notifications
      }
    }
    
    socket.on('commentAdded', handleCommentAdded)
    
    return () => {
      socket.off('commentAdded', handleCommentAdded)
    }
  }, [socket, agentId, notifications])
  
  const markAsRead = async (notificationIds?: number[], markAll = false) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          markAll,
        }),
      })
      
      if (response.ok) {
        if (markAll) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
          setUnreadCount(0)
        } else if (notificationIds) {
          setNotifications(prev => prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, isRead: true }
              : n
          ))
          setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        }
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }
  
  const markAllAsRead = () => {
    markAsRead(undefined, true)
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }
  
  const getNotificationText = (notification: CommentNotification) => {
    const agentName = notification.comment?.agent.name || 'Someone'
    const taskTitle = notification.task?.title || 'a task'
    
    switch (notification.type) {
      case 'mention':
        return `${agentName} mentioned you in ${taskTitle}`
      case 'reply':
        return `${agentName} replied to your comment in ${taskTitle}`
      case 'assigned':
        return `You were assigned to comment in ${taskTitle}`
      default:
        return `New activity in ${taskTitle}`
    }
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 ${className}`}
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-[20px] flex items-center justify-center text-xs font-medium p-0"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-slate-800 border-slate-700"
        onInteractOutside={() => setIsOpen(false)}
      >
        <div className="flex items-center justify-between p-3">
          <DropdownMenuLabel className="text-slate-100 font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator className="bg-slate-700" />
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-1 p-1">
              {notifications.map(notification => {
                const Icon = notificationIcons[notification.type] || MessageSquare
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      notification.isRead 
                        ? 'text-slate-400' 
                        : 'text-slate-200 bg-blue-500/5'
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead([notification.id])
                      }
                      // Navigate to task (you'd implement this navigation)
                      window.location.href = `/tasks/${notification.taskId}`
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{ 
                          backgroundColor: notification.comment?.agent.color || '#3b82f6' 
                        }}
                      >
                        {notification.comment?.agent.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs text-slate-500">
                          {formatDate(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <Dot className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-sm line-clamp-2">
                        {getNotificationText(notification)}
                      </p>
                      
                      {notification.comment?.content && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          "{notification.comment.content}"
                        </p>
                      )}
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}