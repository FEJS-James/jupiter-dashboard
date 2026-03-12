const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

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
      origin: dev ? '*' : process.env.NEXTAUTH_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  })

  // Store connected users and their presence
  const connectedUsers = new Map()
  const userPresence = new Map()

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)
    
    // Handle user joining a board
    socket.on('join', (boardId, user) => {
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
    socket.on('leave', (boardId) => {
      const user = connectedUsers.get(socket.id)
      if (user) {
        socket.to(boardId).emit('userLeft', user.id)
        socket.leave(boardId)
        console.log(`User ${user.name} left board ${boardId}`)
      }
    })

    // Handle presence updates
    socket.on('updatePresence', (presence) => {
      userPresence.set(socket.id, presence)
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('userPresence', 
          Array.from(connectedUsers.values()).filter(u => u.boardId === user.boardId)
        )
      }
    })

    // Handle task operations
    socket.on('taskCreated', (task) => {
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskCreated', task)
        
        const activity = {
          id: `activity_${Date.now()}`,
          type: 'task_created',
          userId: user.id,
          userName: user.name,
          taskId: task.id,
          taskTitle: task.title,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
      }
    })

    socket.on('taskUpdated', (task) => {
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskUpdated', task)
        
        const activity = {
          id: `activity_${Date.now()}`,
          type: 'task_updated',
          userId: user.id,
          userName: user.name,
          taskId: task.id,
          taskTitle: task.title,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
      }
    })

    socket.on('taskDeleted', (taskId) => {
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskDeleted', taskId)
        
        const activity = {
          id: `activity_${Date.now()}`,
          type: 'task_deleted',
          userId: user.id,
          userName: user.name,
          taskId,
          timestamp: new Date()
        }
        io.to(user.boardId).emit('activity', activity)
      }
    })

    socket.on('taskMoved', (taskId, fromStatus, toStatus, task) => {
      const user = connectedUsers.get(socket.id)
      if (user?.boardId) {
        socket.to(user.boardId).emit('taskMoved', taskId, fromStatus, toStatus, task)
        
        const activity = {
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

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('> Socket.IO server ready')
  })
})