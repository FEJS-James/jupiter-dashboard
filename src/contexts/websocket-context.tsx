'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Task, TaskStatus, NotificationWithRelations } from '@/types'

export interface ConnectedUser {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  lastSeen: Date
  boardId?: string
}

export interface UserPresence {
  userId: string
  status: 'viewing' | 'editing' | 'idle'
  taskId?: number
  timestamp: Date
}

export interface ActivityEvent {
  id: string
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'task_moved' | 'user_joined' | 'user_left'
  userId: string
  userName: string
  taskId?: number
  taskTitle?: string
  fromStatus?: TaskStatus
  toStatus?: TaskStatus
  timestamp: Date
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

export interface NotificationEvent {
  type: 'notification_created' | 'notification_updated' | 'notification_deleted'
  notification: NotificationWithRelations
  recipientId: number
}

interface WebSocketContextValue {
  socket: null
  connectionStatus: ConnectionStatus
  connectedUsers: ConnectedUser[]
  activities: ActivityEvent[]
  
  // Connection methods
  connect: () => void
  disconnect: () => void
  joinBoard: (boardId: string, user: ConnectedUser) => void
  leaveBoard: (boardId: string) => void
  
  // Task operation methods (with optimistic updates support)
  emitTaskCreated: (task: Task, optimistic?: boolean) => void
  emitTaskUpdated: (task: Task, optimistic?: boolean) => void
  emitTaskDeleted: (taskId: number, optimistic?: boolean) => void
  emitTaskMoved: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task, optimistic?: boolean) => void
  
  // Notification methods
  emitNotificationRead: (notificationId: number) => void
  emitNotificationDeleted: (notificationId: number) => void
  emitNotificationsReadAll: (recipientId: number) => void
  
  // Presence methods
  updatePresence: (presence: UserPresence) => void
  
  // Event listeners (no-ops in polling mode — data is fetched via API)
  onTaskCreated: (callback: (task: Task) => void) => () => void
  onTaskUpdated: (callback: (task: Task) => void) => () => void
  onTaskDeleted: (callback: (taskId: number) => void) => () => void
  onTaskMoved: (callback: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void) => () => void
  
  // Notification event listeners
  onNotificationCreated: (callback: (notification: NotificationWithRelations) => void) => () => void
  onNotificationUpdated: (callback: (notification: NotificationWithRelations) => void) => () => void
  onNotificationDeleted: (callback: (notificationId: number) => void) => () => void
  
  // Operation management
  clearRollbackTimer: (operationId: string) => void
  
  // Clear activities
  clearActivities: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
  url?: string
}

/**
 * WebSocket Provider — Polling Mode
 * 
 * In the Vercel deployment, there's no persistent WebSocket server.
 * This provider maintains the same interface but uses polling for real-time updates.
 * Components that need fresh data should refetch from API endpoints.
 */
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [connectionStatus] = useState<ConnectionStatus>('connected')
  const [connectedUsers] = useState<ConnectedUser[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])

  // Event callback refs for polling-triggered updates
  const taskCreatedCallbacks = useRef<Set<(task: Task) => void>>(new Set())
  const taskUpdatedCallbacks = useRef<Set<(task: Task) => void>>(new Set())
  const taskDeletedCallbacks = useRef<Set<(taskId: number) => void>>(new Set())
  const taskMovedCallbacks = useRef<Set<(taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void>>(new Set())
  const notificationCreatedCallbacks = useRef<Set<(notification: NotificationWithRelations) => void>>(new Set())
  const notificationUpdatedCallbacks = useRef<Set<(notification: NotificationWithRelations) => void>>(new Set())
  const notificationDeletedCallbacks = useRef<Set<(notificationId: number) => void>>(new Set())

  // No-op connection methods (always "connected" in polling mode)
  const connect = useCallback(() => {}, [])
  const disconnect = useCallback(() => {}, [])
  const joinBoard = useCallback((_boardId: string, _user: ConnectedUser) => {}, [])
  const leaveBoard = useCallback((_boardId: string) => {}, [])

  // Task emit methods — these are no-ops since the API routes handle persistence
  // The UI should refetch after mutations
  const emitTaskCreated = useCallback((_task: Task, _optimistic?: boolean) => {}, [])
  const emitTaskUpdated = useCallback((_task: Task, _optimistic?: boolean) => {}, [])
  const emitTaskDeleted = useCallback((_taskId: number, _optimistic?: boolean) => {}, [])
  const emitTaskMoved = useCallback((_taskId: number, _fromStatus: TaskStatus, _toStatus: TaskStatus, _task: Task, _optimistic?: boolean) => {}, [])

  // Notification emit methods — no-ops
  const emitNotificationRead = useCallback((_notificationId: number) => {}, [])
  const emitNotificationDeleted = useCallback((_notificationId: number) => {}, [])
  const emitNotificationsReadAll = useCallback((_recipientId: number) => {}, [])

  // Presence — no-op
  const updatePresence = useCallback((_presence: UserPresence) => {}, [])

  // Event listener registration (for components that want to react to real-time events)
  const onTaskCreated = useCallback((callback: (task: Task) => void) => {
    taskCreatedCallbacks.current.add(callback)
    return () => { taskCreatedCallbacks.current.delete(callback) }
  }, [])

  const onTaskUpdated = useCallback((callback: (task: Task) => void) => {
    taskUpdatedCallbacks.current.add(callback)
    return () => { taskUpdatedCallbacks.current.delete(callback) }
  }, [])

  const onTaskDeleted = useCallback((callback: (taskId: number) => void) => {
    taskDeletedCallbacks.current.add(callback)
    return () => { taskDeletedCallbacks.current.delete(callback) }
  }, [])

  const onTaskMoved = useCallback((callback: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void) => {
    taskMovedCallbacks.current.add(callback)
    return () => { taskMovedCallbacks.current.delete(callback) }
  }, [])

  const onNotificationCreated = useCallback((callback: (notification: NotificationWithRelations) => void) => {
    notificationCreatedCallbacks.current.add(callback)
    return () => { notificationCreatedCallbacks.current.delete(callback) }
  }, [])

  const onNotificationUpdated = useCallback((callback: (notification: NotificationWithRelations) => void) => {
    notificationUpdatedCallbacks.current.add(callback)
    return () => { notificationUpdatedCallbacks.current.delete(callback) }
  }, [])

  const onNotificationDeleted = useCallback((callback: (notificationId: number) => void) => {
    notificationDeletedCallbacks.current.add(callback)
    return () => { notificationDeletedCallbacks.current.delete(callback) }
  }, [])

  const clearRollbackTimer = useCallback((_operationId: string) => {}, [])
  const clearActivities = useCallback(() => { setActivities([]) }, [])

  const value: WebSocketContextValue = {
    socket: null,
    connectionStatus,
    connectedUsers,
    activities,
    connect,
    disconnect,
    joinBoard,
    leaveBoard,
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskDeleted,
    emitTaskMoved,
    emitNotificationRead,
    emitNotificationDeleted,
    emitNotificationsReadAll,
    updatePresence,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskMoved,
    onNotificationCreated,
    onNotificationUpdated,
    onNotificationDeleted,
    clearRollbackTimer,
    clearActivities,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
