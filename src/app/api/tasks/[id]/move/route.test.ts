import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST } from './route'
import { db } from '@/lib/db'

// Mock the database with proper chaining
const createMockQuery = () => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
})

const mockUpdate = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
}

const mockDb = {
  select: vi.fn(() => createMockQuery()),
  update: vi.fn(() => mockUpdate),
}

vi.mock('@/lib/db', () => ({
  db: mockDb
}))

// Mock drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  relations: vi.fn((table, callback) => ({ table, callback, type: 'relations' })),
}))

const createMockRequest = (body: any) => {
  return {
    url: 'https://localhost:3000/api/tasks/1/move',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Request
}

const mockExistingTask = {
  id: 1,
  projectId: 1,
  title: 'Test Task',
  status: 'backlog',
  assignedAgent: 'coder'
}

const mockAgent = {
  id: 1,
  name: 'reviewer',
  role: 'reviewer'
}

describe('/api/tasks/[id]/move API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/tasks/[id]/move', () => {
    it('successfully moves task to new status', async () => {
      // Mock task existence check
      const mockTaskQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingTask])
      }
      
      // Mock agent existence check (when agent is provided)
      const mockAgentQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAgent])
      }

      vi.mocked(db.select).mockImplementation(() => {
        let callCount = 0
        return {
          from: vi.fn(() => {
            callCount++
            if (callCount === 1) return mockTaskQuery // First call for task
            return mockAgentQuery // Second call for agent
          })
        } as any
      })

      // Mock update operation
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          ...mockExistingTask,
          status: 'in-progress',
          assignedAgent: 'reviewer'
        }])
      }

      vi.mocked(db.update).mockReturnValue(mockUpdate as any)

      const moveData = {
        status: 'in-progress',
        assignedAgent: 'reviewer'
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(db.select).toHaveBeenCalled()
      expect(db.update).toHaveBeenCalled()
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: 'in-progress',
        assignedAgent: 'reviewer'
      })
      expect(mockUpdate.where).toHaveBeenCalled()
      expect(mockUpdate.returning).toHaveBeenCalled()
    })

    it('moves task without changing agent when agent not provided', async () => {
      // Mock task existence check
      const mockTaskQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingTask])
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue(mockTaskQuery)
      } as any)

      // Mock update operation
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          ...mockExistingTask,
          status: 'code-review'
        }])
      }

      vi.mocked(db.update).mockReturnValue(mockUpdate as any)

      const moveData = {
        status: 'code-review'
        // No assignedAgent provided
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: 'code-review'
      })
    })

    it('returns error when task not found', async () => {
      // Mock task not found
      const mockTaskQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]) // Empty array = not found
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue(mockTaskQuery)
      } as any)

      const moveData = {
        status: 'in-progress'
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: '999' })
      
      const response = await POST(request, { params })
      
      expect(response.status).toBe(404)
    })

    it('returns error when assigned agent not found', async () => {
      // Mock: first call for task (found), second call for agent (not found)
      let callCount = 0
      mockDb.select.mockImplementation(() => {
        const query = createMockQuery()
        callCount++
        if (callCount === 1) {
          // Task exists
          query.limit.mockResolvedValue([mockExistingTask])
        } else {
          // Agent doesn't exist
          query.limit.mockResolvedValue([])
        }
        return query
      })

      const moveData = {
        status: 'in-progress',
        assignedAgent: 'nonexistent-agent'
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(response.status).toBe(400)
    })

    it('handles invalid task ID', async () => {
      const moveData = {
        status: 'in-progress'
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: 'invalid-id' })
      
      const response = await POST(request, { params })
      
      expect(response.status).toBe(400)
    })

    it('validates move data against schema', async () => {
      const invalidMoveData = {
        status: 'invalid-status', // Invalid status
        assignedAgent: 123 // Should be string
      }

      const request = createMockRequest(invalidMoveData)
      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(response.status).toBe(400)
    })

    it('handles invalid JSON in request body', async () => {
      const request = {
        url: 'https://localhost:3000/api/tasks/1/move',
        method: 'POST',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('invalid json'),
      } as unknown as Request

      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(response.status).toBe(400)
    })

    it('handles different valid statuses', async () => {
      const validStatuses = ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']
      
      for (const status of validStatuses) {
        // Mock task existence
        const mockTaskQuery = {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockExistingTask])
        }

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue(mockTaskQuery)
        } as any)

        // Mock successful update
        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{
            ...mockExistingTask,
            status
          }])
        }

        vi.mocked(db.update).mockReturnValue(mockUpdate as any)

        const moveData = { status }
        const request = createMockRequest(moveData)
        const params = Promise.resolve({ id: '1' })
        
        const response = await POST(request, { params })
        
        expect(mockUpdate.set).toHaveBeenCalledWith({ status })
        
        vi.clearAllMocks()
      }
    })

    it('allows unsetting assigned agent with null', async () => {
      // Mock task existence
      const query = createMockQuery()
      query.limit.mockResolvedValue([mockExistingTask])
      mockDb.select.mockReturnValue(query)

      // Mock update operation - use the global mockUpdate
      mockUpdate.returning.mockResolvedValue([{
        ...mockExistingTask,
        status: 'backlog',
        assignedAgent: null
      }])

      const moveData = {
        status: 'backlog',
        assignedAgent: null
      }

      const request = createMockRequest(moveData)
      const params = Promise.resolve({ id: '1' })
      
      const response = await POST(request, { params })
      
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: 'backlog',
        assignedAgent: null
      })
    })
  })
})