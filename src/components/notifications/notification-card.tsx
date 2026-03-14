'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { NotificationWithRelations, NotificationType } from '@/types'
import { 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  UserPlus, 
  Settings, 
  FileText,
  FolderPlus,
  Users,
  Bell
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationCardProps {
  notification: NotificationWithRelations
  onClick: () => void
  showActions?: boolean
}

export const NotificationCard = React.memo(function NotificationCard({ 
  notification, 
  onClick, 
  showActions = false 
}: NotificationCardProps) {
  const isUnread = !notification.isRead
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/80 border-l-4",
        isUnread ? "bg-muted/50 border-l-primary" : "bg-background border-l-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 p-1.5 rounded-full",
          getIconBgColor(notification.type, notification.priority)
        )}>
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isUnread ? "text-foreground" : "text-muted-foreground"
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            
            {/* Priority badge */}
            {notification.priority !== 'normal' && (
              <Badge 
                variant={getPriorityVariant(notification.priority)}
                className="text-xs ml-2 flex-shrink-0"
              >
                {notification.priority}
              </Badge>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              
              {/* Entity info */}
              {notification.task && (
                <span className="text-blue-600">
                  • Task: {notification.task.title}
                </span>
              )}
              {notification.project && (
                <span className="text-green-600">
                  • Project: {notification.project.name}
                </span>
              )}
            </div>

            {/* Read indicator */}
            {isUnread && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

function getNotificationIcon(type: NotificationType) {
  const iconProps = { className: "h-4 w-4" }
  
  switch (type) {
    case 'task_assigned':
    case 'task_reassigned':
      return <UserPlus {...iconProps} />
    case 'task_status_changed':
      return <CheckCircle {...iconProps} />
    case 'task_priority_changed':
      return <AlertTriangle {...iconProps} />
    case 'comment_added':
    case 'comment_mention':
    case 'comment_reply':
      return <MessageSquare {...iconProps} />
    case 'project_task_added':
      return <FolderPlus {...iconProps} />
    case 'project_updated':
      return <FileText {...iconProps} />
    case 'system_announcement':
      return <Bell {...iconProps} />
    default:
      return <Bell {...iconProps} />
  }
}

function getIconBgColor(type: NotificationType, priority: string) {
  // High priority gets warning colors
  if (priority === 'high' || priority === 'urgent') {
    return "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
  }
  
  switch (type) {
    case 'task_assigned':
    case 'task_reassigned':
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
    case 'task_status_changed':
      return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
    case 'task_priority_changed':
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
    case 'comment_added':
    case 'comment_mention':
    case 'comment_reply':
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
    case 'project_task_added':
    case 'project_updated':
      return "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400"
    case 'system_announcement':
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"
  }
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'urgent':
      return 'destructive'
    case 'high':
      return 'secondary'
    default:
      return 'outline'
  }
}