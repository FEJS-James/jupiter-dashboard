'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight, 
  User, 
  UserMinus,
  Clock,
  X
} from 'lucide-react'
import { useWebSocket, ActivityEvent } from '@/contexts/websocket-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface ActivityFeedProps {
  className?: string
  maxItems?: number
  showHeader?: boolean
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  className,
  maxItems = 20,
  showHeader = true 
}) => {
  const { activities, clearActivities } = useWebSocket()

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'task_created':
        return Plus
      case 'task_updated':
        return Edit
      case 'task_deleted':
        return Trash2
      case 'task_moved':
        return ArrowRight
      case 'user_joined':
        return User
      case 'user_left':
        return UserMinus
      default:
        return Clock
    }
  }

  const getActivityColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'task_created':
        return 'text-green-400'
      case 'task_updated':
        return 'text-blue-400'
      case 'task_deleted':
        return 'text-red-400'
      case 'task_moved':
        return 'text-orange-400'
      case 'user_joined':
        return 'text-purple-400'
      case 'user_left':
        return 'text-gray-400'
      default:
        return 'text-slate-400'
    }
  }

  const formatActivity = (activity: ActivityEvent) => {
    switch (activity.type) {
      case 'task_created':
        return `created task "${activity.taskTitle}"`
      case 'task_updated':
        return `updated task "${activity.taskTitle}"`
      case 'task_deleted':
        return `deleted a task`
      case 'task_moved':
        return `moved task from ${activity.fromStatus} to ${activity.toStatus}`
      case 'user_joined':
        return `joined the board`
      case 'user_left':
        return `left the board`
      default:
        return 'performed an action'
    }
  }

  const displayedActivities = activities.slice(0, maxItems)

  if (displayedActivities.length === 0) {
    return (
      <div className={cn('text-xs text-slate-500 py-2', className)}>
        No recent activity
      </div>
    )
  }

  return (
    <Card className={cn('bg-slate-800/50 border-slate-700', className)}>
      {showHeader && (
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActivities}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {displayedActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const iconColor = getActivityColor(activity.type)
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <div className={cn('p-1.5 rounded-full bg-slate-700', iconColor)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-slate-600">
                          {activity.userName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {activity.userName}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatActivity(activity)}
                    </p>
                    
                    {activity.type === 'task_moved' && activity.fromStatus && activity.toStatus && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {activity.fromStatus}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {activity.toStatus}
                        </Badge>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        
        {activities.length > maxItems && (
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Showing {maxItems} of {activities.length} activities
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact activity indicator for showing in the header
export const ActivityIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { activities } = useWebSocket()
  const recentActivities = activities.filter(
    activity => Date.now() - new Date(activity.timestamp).getTime() < 30000 // Last 30 seconds
  )

  if (recentActivities.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75" />
      </div>
      <span className="text-xs text-muted-foreground">
        {recentActivities.length} recent updates
      </span>
    </div>
  )
}