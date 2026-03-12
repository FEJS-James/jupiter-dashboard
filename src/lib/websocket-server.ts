import { Server as HTTPServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { TaskStatus, Task, Agent } from '@/types'

export type WebSocketServer = SocketIOServer

export interface ServerToClientEvents {
  // Task events
  taskCreated: (task: Task) => void
  taskUpdated: (task: Task) => void
  taskDeleted: (taskId: number) => void
  taskMoved: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => void
  
  // Real-time collaboration
  userJoined: (user: ConnectedUser) => void
  userLeft: (userId: string) => void
  userPresence: (users: ConnectedUser[]) => void
  
  // Connection status
  connectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void
  
  // Activity feed
  activity: (activity: ActivityEvent) => void
}

export interface ClientToServerEvents {
  // Connection events
  join: (boardId: string, user: ConnectedUser) => void
  leave: (boardId: string) => void
  
  // Task operations
  createTask: (task: Partial<Task>) => void
  updateTask: (taskId: number, updates: Partial<Task>) => void
  deleteTask: (taskId: number) => void
  moveTask: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus) => void
  
  // User presence
  updatePresence: (presence: UserPresence) => void
}

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

let io: WebSocketServer

// Store connected users and their presence
const connectedUsers = new Map<string, ConnectedUser>()
const userPresence = new Map<string, UserPresence>()

export const initSocketIO = (server: HTTPServer): WebSocketServer => {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
          : '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    })

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)
      
      // Handle user joining a board
      socket.on('join', (boardId: string, user: ConnectedUser) => {
        socket.join(boardId)
        connectedUsers.set(socket.id, { ...user, boardId })
        
        // Broadcast user joined to others in the board
        socket.to(boardId).emit('userJoined', user)
        
        // Send current users to the newly joined user
        const boardUsers = Array.from(connectedUsers.values())
          .filter(u => u.boardId === boardId && u.id !== user.id)
        socket.emit('userPresence', boardUsers)
        
        console.log(`User ${user.name} joined board ${boardId}`)
      })

      // Handle user leaving a board
      socket.on('leave', (boardId: string) => {
        const user = connectedUsers.get(socket.id)
        if (user) {
          socket.to(boardId).emit('userLeft', user.id)
          socket.leave(boardId)
          console.log(`User ${user.name} left board ${boardId}`)
        }
      })

      // Handle presence updates
      socket.on('updatePresence', (presence: UserPresence) => {
        userPresence.set(socket.id, presence)
        const user = connectedUsers.get(socket.id)
        if (user?.boardId) {
          socket.to(user.boardId).emit('userPresence', 
            Array.from(connectedUsers.values()).filter(u => u.boardId === user.boardId)
          )
        }
      })

      // Handle task operations
      socket.on('createTask', async (taskData: Partial<Task>) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user?.boardId) return

          // Here you would typically save to database
          // For now, we'll emit the created task with a mock ID
          const newTask: Task = {
            id: Date.now(), // In real app, this would come from DB
            ...taskData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Task

          // Broadcast task creation to all users in the board
          io.to(user.boardId).emit('taskCreated', newTask)
          
          // Add activity event
          const activity: ActivityEvent = {
            id: `activity_${Date.now()}`,
            type: 'task_created',
            userId: user.id,
            userName: user.name,
            taskId: newTask.id,
            taskTitle: newTask.title,
            timestamp: new Date()
          }
          io.to(user.boardId).emit('activity', activity)
          
        } catch (error) {
          console.error('Error creating task:', error)
          socket.emit('error', 'Failed to create task')
        }
      })

      socket.on('updateTask', async (taskId: number, updates: Partial<Task>) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user?.boardId) return

          // Here you would update the database
          const updatedTask = { ...updates, id: taskId, updatedAt: new Date().toISOString() } as Task
          
          // Broadcast task update
          io.to(user.boardId).emit('taskUpdated', updatedTask)
          
          const activity: ActivityEvent = {
            id: `activity_${Date.now()}`,
            type: 'task_updated',
            userId: user.id,
            userName: user.name,
            taskId,
            taskTitle: updatedTask.title,
            timestamp: new Date()
          }
          io.to(user.boardId).emit('activity', activity)
          
        } catch (error) {
          console.error('Error updating task:', error)
          socket.emit('error', 'Failed to update task')
        }
      })

      socket.on('moveTask', async (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user?.boardId) return

          // Here you would update the database
          const movedTask = { 
            id: taskId, 
            status: toStatus, 
            updatedAt: new Date().toISOString() 
          } as Task
          
          // Broadcast task move
          io.to(user.boardId).emit('taskMoved', taskId, fromStatus, toStatus, movedTask)
          
          const activity: ActivityEvent = {
            id: `activity_${Date.now()}`,
            type: 'task_moved',
            userId: user.id,
            userName: user.name,
            taskId,
            fromStatus,
            toStatus,
            timestamp: new Date()
          }
          io.to(user.boardId).emit('activity', activity)
          
        } catch (error) {
          console.error('Error moving task:', error)
          socket.emit('error', 'Failed to move task')
        }
      })

      socket.on('deleteTask', async (taskId: number) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user?.boardId) return

          // Here you would delete from database
          
          // Broadcast task deletion
          io.to(user.boardId).emit('taskDeleted', taskId)
          
          const activity: ActivityEvent = {
            id: `activity_${Date.now()}`,
            type: 'task_deleted',
            userId: user.id,
            userName: user.name,
            taskId,
            timestamp: new Date()
          }
          io.to(user.boardId).emit('activity', activity)
          
        } catch (error) {
          console.error('Error deleting task:', error)
          socket.emit('error', 'Failed to delete task')
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id)
        if (user?.boardId) {
          socket.to(user.boardId).emit('userLeft', user.id)
          console.log(`User ${user.name} disconnected from board ${user.boardId}`)
        }
        connectedUsers.delete(socket.id)
        userPresence.delete(socket.id)
      })
    })
  }
  
  return io
}

export const getSocketIOServer = (): WebSocketServer | undefined => io