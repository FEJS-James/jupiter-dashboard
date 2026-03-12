'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import { Task, TaskStatus } from '@/types'

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
  
  // Task operation methods
  emitTaskCreated: (task: Task) => void
  emitTaskUpdated: (task: Task) => void
  emitTaskDeleted: (taskId: number) => void
  emitTaskMoved: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void
  
  // Presence methods
  updatePresence: (presence: UserPresence) => void
  
  // Event listeners
  onTaskCreated: (callback: (task: Task) => void) => () => void
  onTaskUpdated: (callback: (task: Task) => void) => () => void
  onTaskDeleted: (callback: (taskId: number) => void) => () => void
  onTaskMoved: (callback: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void) => () => void
  
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

  const connect = useCallback(() => {
    if (socket?.connected) return

    setConnectionStatus('connecting')
    
    const newSocket = io(url, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setConnectionStatus('connected')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setConnectionStatus('disconnected')
    })

    newSocket.on('reconnecting', () => {
      console.log('WebSocket reconnecting...')
      setConnectionStatus('reconnecting')
    })

    newSocket.on('reconnect', () => {
      console.log('WebSocket reconnected')
      setConnectionStatus('connected')
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setConnectionStatus('error')
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

    setSocket(newSocket)
  }, [url, socket])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setConnectionStatus('disconnected')
      setConnectedUsers([])
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

  const emitTaskCreated = useCallback((task: Task) => {
    if (socket?.connected) {
      socket.emit('taskCreated', task)
    }
  }, [socket])

  const emitTaskUpdated = useCallback((task: Task) => {
    if (socket?.connected) {
      socket.emit('taskUpdated', task)
    }
  }, [socket])

  const emitTaskDeleted = useCallback((taskId: number) => {
    if (socket?.connected) {
      socket.emit('taskDeleted', taskId)
    }
  }, [socket])

  const emitTaskMoved = useCallback((taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => {
    if (socket?.connected) {
      socket.emit('taskMoved', taskId, fromStatus, toStatus, task)
    }
  }, [socket])

  const updatePresence = useCallback((presence: UserPresence) => {
    if (socket?.connected) {
      socket.emit('updatePresence', presence)
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

  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  useEffect(() => {
    // Auto-connect when component mounts
    connect()
    
    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

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
    updatePresence,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskMoved,
    clearActivities
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}