'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, Eye, Edit, Clock } from 'lucide-react'
import { useWebSocket, ConnectedUser } from '@/contexts/websocket-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface UserPresenceProps {
  className?: string
  maxUsers?: number
  showCount?: boolean
}

export const UserPresence: React.FC<UserPresenceProps> = ({ 
  className,
  maxUsers = 5,
  showCount = true 
}) => {
  const { connectedUsers } = useWebSocket()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserStatusColor = (user: ConnectedUser) => {
    // You could extend this with real presence status
    return 'bg-green-500' // Online
  }

  const visibleUsers = connectedUsers.slice(0, maxUsers)
  const remainingCount = Math.max(0, connectedUsers.length - maxUsers)

  if (connectedUsers.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {showCount && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{connectedUsers.length}</span>
          </div>
        )}

        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-slate-700">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback 
                      className="text-xs font-medium"
                      style={{ backgroundColor: user.color }}
                    >
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div 
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                      getUserStatusColor(user)
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.lastSeen && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Active {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-slate-700">
                    <AvatarFallback className="text-xs font-medium bg-slate-600 text-slate-300">
                      +{remainingCount}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p className="font-medium">+{remainingCount} more users online</p>
                  <ScrollArea className="max-h-32 mt-2">
                    {connectedUsers.slice(maxUsers).map((user) => (
                      <div key={user.id} className="flex items-center gap-2 py-1">
                        <div
                          className="w-2 h-2 rounded-full bg-green-500"
                        />
                        <span className="text-xs">{user.name}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

interface TaskPresenceProps {
  taskId: number
  className?: string
}

export const TaskPresence: React.FC<TaskPresenceProps> = ({ taskId, className }) => {
  const { connectedUsers } = useWebSocket()
  
  // Filter users who are viewing/editing this specific task
  // This would require extending the presence system to track task-level presence
  const taskUsers = connectedUsers.filter(user => {
    // This is a placeholder - you'd implement task-level presence tracking
    return false // user.currentTaskId === taskId
  })

  if (taskUsers.length === 0) return null

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {taskUsers.slice(0, 3).map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback 
                    className="text-xs"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1">
                  <Eye className="w-3 h-3 text-blue-400" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{user.name} is viewing this task</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {taskUsers.length > 3 && (
          <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
            +{taskUsers.length - 3}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  )
}

// Activity indicator for showing recent activity
export const ActivityIndicator: React.FC<{ className?: string }> = ({ className }) => {
  // This would show a pulse or indicator when there's recent activity
  return (
    <div className={cn('relative', className)}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75" />
    </div>
  )
}