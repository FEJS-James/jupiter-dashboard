'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { Task, TaskStatus, Notification, NotificationWithRelations } from '@/types'

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
  socket: Socket | null
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
  
  // Event listeners
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

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000' 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  
  // Refs for race condition handling
  const rollbackTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pendingOperationsRef = useRef<Map<string, any>>(new Map())
  const connectionAttemptsRef = useRef<number>(0)

  // Clear rollback timer when server confirms success
  const clearRollbackTimer = useCallback((operationId: string) => {
    const timer = rollbackTimersRef.current.get(operationId)
    if (timer) {
      clearTimeout(timer)
      rollbackTimersRef.current.delete(operationId)
    }
    pendingOperationsRef.current.delete(operationId)
  }, [])

  // Set rollback timer for optimistic updates
  const setRollbackTimer = useCallback((operationId: string, rollbackFn: () => void, timeoutMs: number = 5000) => {
    const timer = setTimeout(() => {
      console.warn(`Operation ${operationId} timed out, rolling back`)
      rollbackFn()
      rollbackTimersRef.current.delete(operationId)
      pendingOperationsRef.current.delete(operationId)
    }, timeoutMs)
    
    rollbackTimersRef.current.set(operationId, timer)
  }, [])

  const connect = useCallback(() => {
    if (socket?.connected) return

    setConnectionStatus('connecting')
    connectionAttemptsRef.current++
    
    const newSocket = io(url, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: Math.min(1000 * Math.pow(2, connectionAttemptsRef.current - 1), 30000), // Exponential backoff
      reconnectionAttempts: 5,
      timeout: 20000,
      auth: {
        // Add authentication token if available
        token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      }
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setConnectionStatus('connected')
      connectionAttemptsRef.current = 0 // Reset on successful connection
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setConnectionStatus('disconnected')
      
      // Clear all pending operations on disconnect
      for (const [operationId, timer] of rollbackTimersRef.current) {
        clearTimeout(timer)
      }
      rollbackTimersRef.current.clear()
      pendingOperationsRef.current.clear()
    })

    newSocket.on('reconnecting', (attempt) => {
      console.log(`WebSocket reconnecting... (attempt ${attempt})`)
      setConnectionStatus('reconnecting')
    })

    newSocket.on('reconnect', (attempt) => {
      console.log(`WebSocket reconnected after ${attempt} attempts`)
      setConnectionStatus('connected')
      connectionAttemptsRef.current = 0
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setConnectionStatus('error')
      
      // Handle specific error types
      if (error.message.includes('Authentication')) {
        console.error('Authentication failed, clearing token')
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
      }
    })

    // Handle server errors
    newSocket.on('error', (error) => {
      console.error('WebSocket server error:', error)
      // Handle validation errors from server
      if (error.message) {
        console.warn('Server validation error:', error.message)
      }
    })

    // User presence events
    newSocket.on('userJoined', (user: ConnectedUser) => {
      setConnectedUsers(prev => [...prev.filter(u => u.id !== user.id), user])
    })

    newSocket.on('userLeft', (userId: string) => {
      setConnectedUsers(prev => prev.filter(u => u.id !== userId))
    })

    newSocket.on('userPresence', (users: ConnectedUser[]) => {
      setConnectedUsers(users)
    })

    // Activity events
    newSocket.on('activity', (activity: ActivityEvent) => {
      setActivities(prev => [activity, ...prev].slice(0, 100)) // Keep last 100 activities
    })

    // Operation confirmations (to clear rollback timers)
    newSocket.on('operationConfirmed', (operationId: string) => {
      clearRollbackTimer(operationId)
    })

    // Operation failed (handle rollback)
    newSocket.on('operationFailed', (operationId: string, error: string) => {
      console.error(`Operation ${operationId} failed:`, error)
      clearRollbackTimer(operationId)
      // The consuming component should handle the rollback based on the operation type
    })

    // Notification events (handled by consuming components)
    // These are set up but event handlers are defined later with the on* methods

    setSocket(newSocket)
  }, [url, socket])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setConnectionStatus('disconnected')
      setConnectedUsers([])
      
      // Clean up all timers
      for (const [operationId, timer] of rollbackTimersRef.current) {
        clearTimeout(timer)
      }
      rollbackTimersRef.current.clear()
      pendingOperationsRef.current.clear()
    }
  }, [socket])

  const joinBoard = useCallback((boardId: string, user: ConnectedUser) => {
    if (socket?.connected) {
      socket.emit('join', boardId, user)
    }
  }, [socket])

  const leaveBoard = useCallback((boardId: string) => {
    if (socket?.connected) {
      socket.emit('leave', boardId)
    }
  }, [socket])

  const emitTaskCreated = useCallback((task: Task, optimistic: boolean = false) => {
    if (socket?.connected) {
      const operationId = `taskCreated_${task.id}_${Date.now()}`
      
      if (optimistic) {
        // Store operation for potential rollback
        pendingOperationsRef.current.set(operationId, { type: 'create', task })
        
        // Set rollback timer
        setRollbackTimer(operationId, () => {
          // Rollback logic would be handled by the consuming component
          console.warn(`Task creation ${task.id} was not confirmed by server`)
        })
      }
      
      socket.emit('taskCreated', task, operationId)
    }
  }, [socket, setRollbackTimer])

  const emitTaskUpdated = useCallback((task: Task, optimistic: boolean = false) => {
    if (socket?.connected) {
      const operationId = `taskUpdated_${task.id}_${Date.now()}`
      
      if (optimistic) {
        pendingOperationsRef.current.set(operationId, { type: 'update', task })
        setRollbackTimer(operationId, () => {
          console.warn(`Task update ${task.id} was not confirmed by server`)
        })
      }
      
      socket.emit('taskUpdated', task, operationId)
    }
  }, [socket, setRollbackTimer])

  const emitTaskDeleted = useCallback((taskId: number, optimistic: boolean = false) => {
    if (socket?.connected) {
      const operationId = `taskDeleted_${taskId}_${Date.now()}`
      
      if (optimistic) {
        pendingOperationsRef.current.set(operationId, { type: 'delete', taskId })
        setRollbackTimer(operationId, () => {
          console.warn(`Task deletion ${taskId} was not confirmed by server`)
        })
      }
      
      socket.emit('taskDeleted', taskId, operationId)
    }
  }, [socket, setRollbackTimer])

  const emitTaskMoved = useCallback((taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task, optimistic: boolean = false) => {
    if (socket?.connected) {
      const operationId = `taskMoved_${taskId}_${Date.now()}`
      
      if (optimistic) {
        pendingOperationsRef.current.set(operationId, { type: 'move', taskId, fromStatus, toStatus, task })
        setRollbackTimer(operationId, () => {
          console.warn(`Task move ${taskId} was not confirmed by server`)
        })
      }
      
      socket.emit('taskMoved', taskId, fromStatus, toStatus, task, operationId)
    }
  }, [socket, setRollbackTimer])

  const updatePresence = useCallback((presence: UserPresence) => {
    if (socket?.connected) {
      socket.emit('updatePresence', presence)
    }
  }, [socket])

  // Notification emit methods
  const emitNotificationRead = useCallback((notificationId: number) => {
    if (socket?.connected) {
      socket.emit('notificationRead', notificationId)
    }
  }, [socket])

  const emitNotificationDeleted = useCallback((notificationId: number) => {
    if (socket?.connected) {
      socket.emit('notificationDeleted', notificationId)
    }
  }, [socket])

  const emitNotificationsReadAll = useCallback((recipientId: number) => {
    if (socket?.connected) {
      socket.emit('notificationsReadAll', recipientId)
    }
  }, [socket])

  // Event listener methods
  const onTaskCreated = useCallback((callback: (task: Task) => void) => {
    if (!socket) return () => {}
    
    socket.on('taskCreated', callback)
    return () => socket.off('taskCreated', callback)
  }, [socket])

  const onTaskUpdated = useCallback((callback: (task: Task) => void) => {
    if (!socket) return () => {}
    
    socket.on('taskUpdated', callback)
    return () => socket.off('taskUpdated', callback)
  }, [socket])

  const onTaskDeleted = useCallback((callback: (taskId: number) => void) => {
    if (!socket) return () => {}
    
    socket.on('taskDeleted', callback)
    return () => socket.off('taskDeleted', callback)
  }, [socket])

  const onTaskMoved = useCallback((callback: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void) => {
    if (!socket) return () => {}
    
    socket.on('taskMoved', callback)
    return () => socket.off('taskMoved', callback)
  }, [socket])

  // Notification event listener methods
  const onNotificationCreated = useCallback((callback: (notification: NotificationWithRelations) => void) => {
    if (!socket) return () => {}
    
    socket.on('notificationCreated', callback)
    return () => socket.off('notificationCreated', callback)
  }, [socket])

  const onNotificationUpdated = useCallback((callback: (notification: NotificationWithRelations) => void) => {
    if (!socket) return () => {}
    
    socket.on('notificationUpdated', callback)
    return () => socket.off('notificationUpdated', callback)
  }, [socket])

  const onNotificationDeleted = useCallback((callback: (notificationId: number) => void) => {
    if (!socket) return () => {}
    
    socket.on('notificationDeleted', callback)
    return () => socket.off('notificationDeleted', callback)
  }, [socket])

  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  useEffect(() => {
    // Auto-connect when component mounts
    connect()
    
    // Cleanup on unmount
    return () => {
      // Clean up all timers and pending operations
      for (const [operationId, timer] of rollbackTimersRef.current) {
        clearTimeout(timer)
      }
      rollbackTimersRef.current.clear()
      pendingOperationsRef.current.clear()
      
      // Disconnect socket
      if (socket) {
        socket.disconnect()
        socket.removeAllListeners()
      }
      setSocket(null)
      setConnectionStatus('disconnected')
      setConnectedUsers([])
      setActivities([])
    }
  }, []) // Only run on mount/unmount - DO NOT include connect/disconnect to avoid infinite loops

  const value: WebSocketContextValue = {
    socket,
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
    clearActivities
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}