import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { randomUUID } from 'crypto'

// Import validation schemas and utilities from TypeScript source
import { validateEventPayload, JoinEventSchema, LeaveEventSchema, TaskCreatedEventSchema, 
         TaskUpdatedEventSchema, TaskDeletedEventSchema, TaskMovedEventSchema, 
         UpdatePresenceEventSchema } from './src/validation/websocket-schemas'
import { RateLimiter } from './src/utils/rate-limiter'
import { WebSocketAuth } from './src/utils/websocket-auth'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Create rate limiter instances
const connectionRateLimiter = new RateLimiter(10, 60000) // 10 connections per minute
const eventRateLimiter = new RateLimiter(120, 60000) // 120 events per minute per connection

// Cleanup rate limiters every 5 minutes
setInterval(() => {
  connectionRateLimiter.cleanup()
  eventRateLimiter.cleanup()
}, 5 * 60 * 1000)

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: dev ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : process.env.ALLOWED_ORIGINS?.split(',') || [`http://localhost:${port}`],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  })

  // Add authentication middleware
  if (!dev) {
    io.use(WebSocketAuth.createAuthMiddleware())
  }

  // Store connected users and their presence
  const connectedUsers = new Map()
  const userPresence = new Map()
  const previousPresenceState = new Map() // For optimized presence updates

  // Rate limiting middleware for socket events
  const createRateLimitedHandler = (handler: Function) => {
    return (...args: any[]) => {
      const socketId = args[0]?.id || 'unknown'
      
      if (eventRateLimiter.isRateLimited(socketId)) {
        console.warn(`Rate limit exceeded for socket ${socketId}`)
        return
      }
      
      handler(...args)
    }
  }

  io.on('connection', (socket) => {
    const clientIP = socket.handshake.address
    console.log(`Socket connected: ${socket.id} from ${clientIP}`)

    // Check connection rate limit
    if (connectionRateLimiter.isRateLimited(clientIP)) {
      console.warn(`Connection rate limit exceeded for IP ${clientIP}`)
      socket.disconnect(true)
      return
    }
    
    // Handle user joining a board with validation
    socket.on('join', createRateLimitedHandler((boardId: string, user: any) => {
      // Validate input
      const validation = validateEventPayload(JoinEventSchema, { boardId, user })
      if (!validation.success) {
        console.error('Invalid join event:', validation.error)
        socket.emit('error', { message: 'Invalid join data', details: validation.error })
        return
      }

      const { data } = validation
      socket.join(data.boardId)
      connectedUsers.set(socket.id, { ...data.user, boardId: data.boardId })
      
      // Broadcast user joined to others in the board
      socket.to(data.boardId).emit('userJoined', data.user)
      
      // Send current users to the newly joined user (optimized - only users in this board)
      const boardUsers = Array.from(connectedUsers.values())
        .filter((u: any) => u.boardId === data.boardId && u.id !== data.user.id)
      socket.emit('userPresence', boardUsers)
      
      console.log(`User ${data.user.name} joined board ${data.boardId}`)
    }))

    // Handle user leaving a board with validation
    socket.on('leave', createRateLimitedHandler((boardId: string) => {
      // Validate input
      const validation = validateEventPayload(LeaveEventSchema, { boardId })
      if (!validation.success) {
        console.error('Invalid leave event:', validation.error)
        socket.emit('error', { message: 'Invalid leave data', details: validation.error })
        return
      }

      const user = connectedUsers.get(socket.id)
      if (user) {
        socket.to(validation.data.boardId).emit('userLeft', user.id)
        socket.leave(validation.data.boardId)
        console.log(`User ${user.name} left board ${validation.data.boardId}`)
      }
    }))

    // Handle presence updates with validation and optimization
    socket.on('updatePresence', createRateLimitedHandler((presence: any) => {
      // Validate input
      const validation = validateEventPayload(UpdatePresenceEventSchema, { presence })
      if (!validation.success) {
        console.error('Invalid presence update:', validation.error)
        socket.emit('error', { message: 'Invalid presence data', details: validation.error })
        return
      }

      const user = connectedUsers.get(socket.id)
      if (!user?.boardId) return

      userPresence.set(socket.id, validation.data.presence)
      
      // Optimized presence updates - only send changes
      const currentBoardUsers = Array.from(connectedUsers.values())
        .filter((u: any) => u.boardId === user.boardId)
      
      const previousState = previousPresenceState.get(user.boardId) || []
      const hasChanges = JSON.stringify(currentBoardUsers) !== JSON.stringify(previousState)
      
      if (hasChanges) {
        socket.to(user.boardId).emit('userPresence', currentBoardUsers)
        previousPresenceState.set(user.boardId, [...currentBoardUsers])
      }
    }))

    // Handle task operations with validation
    socket.on('taskCreated', createRateLimitedHandler((task: any, operationId?: string) => {
      // Validate input
      const validation = validateEventPayload(TaskCreatedEventSchema, { task })
      if (!validation.success) {
        console.error('Invalid taskCreated event:', validation.error)
        socket.emit('error', { message: 'Invalid task data', details: validation.error })
        if (operationId) {
          socket.emit('operationFailed', operationId, validation.error)
        }
        return
      }

      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskCreated', validation.data.task)
        
        const activity = {
          id: randomUUID(), // Fixed: Use randomUUID() instead of Date.now()
          type: 'task_created',
          userId: user.id,
          userName: user.name,
          taskId: validation.data.task.id,
          taskTitle: validation.data.task.title,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
        
        // Confirm operation success
        if (operationId) {
          socket.emit('operationConfirmed', operationId)
        }
      }
    }))

    socket.on('taskUpdated', createRateLimitedHandler((task: any, operationId?: string) => {
      // Validate input
      const validation = validateEventPayload(TaskUpdatedEventSchema, { task })
      if (!validation.success) {
        console.error('Invalid taskUpdated event:', validation.error)
        socket.emit('error', { message: 'Invalid task data', details: validation.error })
        if (operationId) {
          socket.emit('operationFailed', operationId, validation.error)
        }
        return
      }

      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskUpdated', validation.data.task)
        
        const activity = {
          id: randomUUID(), // Fixed: Use randomUUID() instead of Date.now()
          type: 'task_updated',
          userId: user.id,
          userName: user.name,
          taskId: validation.data.task.id,
          taskTitle: validation.data.task.title,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
        
        // Confirm operation success
        if (operationId) {
          socket.emit('operationConfirmed', operationId)
        }
      }
    }))

    socket.on('taskDeleted', createRateLimitedHandler((taskId: number, operationId?: string) => {
      // Validate input
      const validation = validateEventPayload(TaskDeletedEventSchema, { taskId })
      if (!validation.success) {
        console.error('Invalid taskDeleted event:', validation.error)
        socket.emit('error', { message: 'Invalid task deletion data', details: validation.error })
        if (operationId) {
          socket.emit('operationFailed', operationId, validation.error)
        }
        return
      }

      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskDeleted', validation.data.taskId)
        
        const activity = {
          id: randomUUID(), // Fixed: Use randomUUID() instead of Date.now()
          type: 'task_deleted',
          userId: user.id,
          userName: user.name,
          taskId: validation.data.taskId,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
        
        // Confirm operation success
        if (operationId) {
          socket.emit('operationConfirmed', operationId)
        }
      }
    }))

    socket.on('taskMoved', createRateLimitedHandler((taskId: number, fromStatus: string, toStatus: string, task: any, operationId?: string) => {
      // Validate input
      const validation = validateEventPayload(TaskMovedEventSchema, { taskId, fromStatus, toStatus, task })
      if (!validation.success) {
        console.error('Invalid taskMoved event:', validation.error)
        socket.emit('error', { message: 'Invalid task move data', details: validation.error })
        if (operationId) {
          socket.emit('operationFailed', operationId, validation.error)
        }
        return
      }

      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        const { taskId, fromStatus, toStatus, task } = validation.data
        socket.to(user.boardId).emit('taskMoved', taskId, fromStatus, toStatus, task)
        
        const activity = {
          id: randomUUID(), // Fixed: Use randomUUID() instead of Date.now()
          type: 'task_moved',
          userId: user.id,
          userName: user.name,
          taskId,
          fromStatus,
          toStatus,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
        
        // Confirm operation success
        if (operationId) {
          socket.emit('operationConfirmed', operationId)
        }
      }
    }))

    // Handle disconnection with proper cleanup
    socket.on('disconnect', (reason) => {
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('userLeft', user.id)
        console.log(`User ${user.name} disconnected from board ${user.boardId} (reason: ${reason})`)
        
        // Clean up presence state for this board
        const remainingBoardUsers = Array.from(connectedUsers.values())
          .filter((u: any) => u.boardId === user.boardId && u.id !== user.id)
        if (remainingBoardUsers.length === 0) {
          previousPresenceState.delete(user.boardId)
        } else {
          previousPresenceState.set(user.boardId, remainingBoardUsers)
        }
      }
      
      // Clean up all references to this socket
      connectedUsers.delete(socket.id)
      userPresence.delete(socket.id)
      
      console.log(`Socket ${socket.id} disconnected and cleaned up`)
    })

    // Handle socket errors
    socket.on('error', (error: any) => {
      console.error(`Socket ${socket.id} error:`, error)
    })
  })

  server.listen(port, (err?: any) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('> Socket.IO server ready')
  })
})