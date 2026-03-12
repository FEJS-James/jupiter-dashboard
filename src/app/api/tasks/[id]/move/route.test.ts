import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST } from './route'
import { db } from '@/lib/db'

// Create a proper mock query that can be awaited
const createMockQuery = (finalResult: any = []) => {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  }
  
  // Set up the chain - each method returns the same query object
  query.from.mockReturnValue(query)
  query.where.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  
  // Make the final query object awaitable by assigning then method
  Object.assign(query, {
    then: (resolve: any) => resolve(finalResult),
    catch: (reject: any) => Promise.resolve(finalResult).catch(reject),
    finally: (fn: any) => Promise.resolve(finalResult).finally(fn),
  })
  
  return query
}

const createMockUpdate = (finalResult: any = []) => {
  const mockUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(finalResult),
  }
  
  return mockUpdate
}

// Mock the database with proper chaining
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }
  
  return { db: mockDb }
})

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
      const mockTaskQuery = createMockQuery([mockExistingTask])
      
      // Mock agent existence check (when agent is provided)
      const mockAgentQuery = createMockQuery([mockAgent])

      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) return mockTaskQuery // First call for task
        return mockAgentQuery // Second call for agent
      })

      // Mock update operation
      const mockUpdate = createMockUpdate([{
        ...mockExistingTask,
        status: 'in-progress',
        assignedAgent: 'reviewer'
      }])

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
      const mockTaskQuery = createMockQuery([mockExistingTask])
      vi.mocked(db.select).mockReturnValue(mockTaskQuery)

      // Mock update operation
      const mockUpdate = createMockUpdate([{
        ...mockExistingTask,
        status: 'code-review'
      }])

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
      const mockTaskQuery = createMockQuery([])
      vi.mocked(db.select).mockReturnValue(mockTaskQuery)

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
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Task exists
          return createMockQuery([mockExistingTask])
        } else {
          // Agent doesn't exist
          return createMockQuery([])
        }
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
        const mockTaskQuery = createMockQuery([mockExistingTask])
        vi.mocked(db.select).mockReturnValue(mockTaskQuery)

        // Mock successful update
        const mockUpdate = createMockUpdate([{
          ...mockExistingTask,
          status
        }])

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
      const mockTaskQuery = createMockQuery([mockExistingTask])
      vi.mocked(db.select).mockReturnValue(mockTaskQuery)

      // Mock update operation
      const mockUpdate = createMockUpdate([{
        ...mockExistingTask,
        status: 'backlog',
        assignedAgent: null
      }])

      vi.mocked(db.update).mockReturnValue(mockUpdate as any)

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