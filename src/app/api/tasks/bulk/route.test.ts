/**
 * @jest-environment node
 */
import { POST } from './route'
import { db } from '@/lib/db'
import { tasks, agents, projects } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// Mock the database
jest.mock('@/lib/db')
jest.mock('@/lib/websocket-manager')
jest.mock('@/lib/activity-logger')
jest.mock('@/lib/notification-service')

const mockDb = db as jest.Mocked<typeof db>

describe('/api/tasks/bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - Bulk Move Operation', () => {
    it('should move multiple tasks to new status', async () => {
      // Mock data
      const existingTasks = [
        { id: 1, projectId: 1, title: 'Task 1', status: 'backlog' },
        { id: 2, projectId: 1, title: 'Task 2', status: 'backlog' }
      ]
      
      const updatedTasks = existingTasks.map(task => ({
        ...task,
        status: 'in-progress'
      }))

      // Mock database calls
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(existingTasks)
            })
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue(updatedTasks)
              })
            })
          })
        }
        return callback(mockTx)
      })

      const request = new Request('http://localhost/api/tasks/bulk?operation=move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          status: 'in-progress',
          preserveAssignments: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully moved 2 tasks to in-progress')
    })

    it('should return error for invalid operation', async () => {
      const request = new Request('http://localhost/api/tasks/bulk?operation=invalid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [1] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Unsupported operation: invalid')
    })

    it('should return error when operation parameter is missing', async () => {
      const request = new Request('http://localhost/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [1] })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Operation parameter is required')
    })
  })

  describe('POST - Bulk Assign Operation', () => {
    it('should assign multiple tasks to agent', async () => {
      const existingTasks = [
        { id: 1, projectId: 1, title: 'Task 1', assignedAgent: null },
        { id: 2, projectId: 1, title: 'Task 2', assignedAgent: null }
      ]
      
      const updatedTasks = existingTasks.map(task => ({
        ...task,
        assignedAgent: 'john-doe'
      }))

      const mockAgent = { id: 1, name: 'john-doe', role: 'coder' }

      // Mock database calls
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAgent])
          })
        })
      })

      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(existingTasks)
            })
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue(updatedTasks)
              })
            })
          })
        }
        return callback(mockTx)
      })

      const request = new Request('http://localhost/api/tasks/bulk?operation=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          assignedAgent: 'john-doe'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully assigned 2 tasks to john-doe')
    })

    it('should return error when agent not found', async () => {
      // Mock database calls
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // Agent not found
          })
        })
      })

      const request = new Request('http://localhost/api/tasks/bulk?operation=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          assignedAgent: 'nonexistent-agent'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Assigned agent not found')
    })
  })

  describe('POST - Bulk Priority Operation', () => {
    it('should update priority for multiple tasks', async () => {
      const existingTasks = [
        { id: 1, projectId: 1, title: 'Task 1', priority: 'medium' },
        { id: 2, projectId: 1, title: 'Task 2', priority: 'low' }
      ]
      
      const updatedTasks = existingTasks.map(task => ({
        ...task,
        priority: 'high'
      }))

      // Mock database calls
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(existingTasks)
            })
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue(updatedTasks)
              })
            })
          })
        }
        return callback(mockTx)
      })

      const request = new Request('http://localhost/api/tasks/bulk?operation=priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          priority: 'high'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully updated priority to high for 2 tasks')
    })
  })

  describe('POST - Bulk Delete Operation', () => {
    it('should delete multiple tasks', async () => {
      const tasksToDelete = [
        { id: 1, projectId: 1, title: 'Task 1' },
        { id: 2, projectId: 1, title: 'Task 2' }
      ]
      
      const deletedTasks = [
        { id: 1, title: 'Task 1', projectId: 1 },
        { id: 2, title: 'Task 2', projectId: 1 }
      ]

      // Mock database calls
      mockDb.transaction = jest.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(tasksToDelete)
            })
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue(deletedTasks)
            })
          })
        }
        return callback(mockTx)
      })

      const request = new Request('http://localhost/api/tasks/bulk?operation=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: [1, 2],
          reason: 'No longer needed'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully deleted 2 tasks')
      expect(data.data.deletedCount).toBe(2)
    })
  })
})