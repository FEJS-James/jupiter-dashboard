import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GET, POST } from './route'
import { db } from '@/lib/db'
import { tasks } from '@/lib/schema'

// Mock Request and NextRequest
const mockUrl = 'https://localhost:3000/api/tasks'
const createMockRequest = (url: string = mockUrl, method: string = 'GET', body?: unknown) => {
  const request = {
    url,
    method,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
  } as unknown as Request & { url: string }
  return request
}

// Create a proper mock query that can be awaited
const createMockQuery = (finalResult: any = []) => {
  const query = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  }
  
  // Each method returns a query object that can be awaited
  const returnQuery = async () => finalResult
  
  // Set up the chain - each method returns the same query object
  query.from.mockReturnValue(query)
  query.leftJoin.mockReturnValue(query)
  query.orderBy.mockReturnValue(query) 
  query.where.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.offset.mockReturnValue(query)
  
  // Make the final query object awaitable by assigning then method
  Object.assign(query, {
    then: (resolve: any) => resolve(finalResult),
    catch: (reject: any) => Promise.resolve(finalResult).catch(reject),
    finally: (fn: any) => Promise.resolve(finalResult).finally(fn),
  })
  
  return query
}

// Mock the database
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  
  return { db: mockDb }
})

// Mock drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  relations: vi.fn((table, callback) => ({ table, callback, type: 'relations' })),
}))

const mockTasks = [
  {
    id: 1,
    projectId: 1,
    title: 'Test Task 1',
    description: 'Test description',
    status: 'backlog',
    priority: 'high',
    assignedAgent: 'coder',
    tags: ['feature', 'api'],
    dueDate: new Date('2024-03-20'),
    effort: 5,
    dependencies: null,
    createdAt: new Date('2024-03-12'),
    updatedAt: new Date('2024-03-12'),
    project: { id: 1, name: 'Test Project', status: 'active' },
    agent: { id: 1, name: 'TestAgent', role: 'coder', color: '#10b981', status: 'available' }
  }
]

describe('/api/tasks API Routes', () => {
  let mockQuery: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery = createMockQuery(mockTasks)
    vi.mocked(db.select).mockReturnValue(mockQuery)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('returns all tasks when no filters applied', async () => {
      const request = createMockRequest()
      const response = await GET(request as any)
      
      expect(response).toBeDefined()
      expect(db.select).toHaveBeenCalled()
      expect(mockQuery.from).toHaveBeenCalledWith(tasks)
    })

    it('applies status filter when provided', async () => {
      const filteredTasks = mockTasks.filter(t => t.status === 'backlog')
      mockQuery = createMockQuery(filteredTasks)
      vi.mocked(db.select).mockReturnValue(mockQuery)

      const request = createMockRequest('https://localhost:3000/api/tasks?status=backlog')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
      expect(mockQuery.where).toHaveBeenCalled()
    })

    it('applies agent filter when provided', async () => {
      const filteredTasks = mockTasks.filter(t => t.assignedAgent === 'coder')
      mockQuery = createMockQuery(filteredTasks)
      vi.mocked(db.select).mockReturnValue(mockQuery)

      const request = createMockRequest('https://localhost:3000/api/tasks?agent=coder')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
      expect(mockQuery.where).toHaveBeenCalled()
    })

    it('applies priority filter when provided', async () => {
      const filteredTasks = mockTasks.filter(t => t.priority === 'high')
      mockQuery = createMockQuery(filteredTasks)
      vi.mocked(db.select).mockReturnValue(mockQuery)

      const request = createMockRequest('https://localhost:3000/api/tasks?priority=high')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
    })

    it('applies pagination when limit and offset provided', async () => {
      mockQuery = createMockQuery(mockTasks)
      vi.mocked(db.select).mockReturnValue(mockQuery)

      const request = createMockRequest('https://localhost:3000/api/tasks?limit=10&offset=5')
      const response = await GET(request as any)
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(mockQuery.offset).toHaveBeenCalledWith(5)
    })

    it('handles project filter by ID', async () => {
      const filteredTasks = mockTasks.filter(t => t.projectId === 1)
      mockQuery = createMockQuery(filteredTasks)
      vi.mocked(db.select).mockReturnValue(mockQuery)

      const request = createMockRequest('https://localhost:3000/api/tasks?project=1')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
    })
  })

  describe('POST /api/tasks', () => {
    const mockProject = [{ id: 1, name: 'Test Project' }]
    const mockAgent = [{ id: 1, name: 'coder', role: 'coder' }]

    beforeEach(() => {
      // Reset the select mock for POST tests
      vi.mocked(db.select).mockClear()
    })

    it('creates a new task with valid data', async () => {
      // Mock project existence check
      const projectQuery = createMockQuery(mockProject)
      
      // Mock agent existence check
      const agentQuery = createMockQuery(mockAgent)

      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) return projectQuery // First call for project
        return agentQuery // Second call for agent
      })

      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 1,
          title: 'New Task',
          description: 'Task description',
          projectId: 1,
          status: 'backlog',
          priority: 'medium',
          assignedAgent: 'coder'
        }])
      }

      vi.mocked(db.insert).mockReturnValue(mockInsert as any)

      const taskData = {
        title: 'New Task',
        description: 'Task description',
        projectId: 1,
        status: 'backlog',
        priority: 'medium',
        assignedAgent: 'coder'
      }

      const request = createMockRequest(mockUrl, 'POST', taskData)
      const response = await POST(request as any)
      
      expect(db.insert).toHaveBeenCalledWith(tasks)
      expect(mockInsert.values).toHaveBeenCalled()
      expect(mockInsert.returning).toHaveBeenCalled()
    })

    it('returns error when project not found', async () => {
      // Mock project not found
      const emptyProjectQuery = createMockQuery([])
      vi.mocked(db.select).mockReturnValue(emptyProjectQuery)

      const taskData = {
        title: 'New Task',
        projectId: 999, // Non-existent project
        status: 'backlog',
        priority: 'medium'
      }

      const request = createMockRequest(mockUrl, 'POST', taskData)
      const response = await POST(request as any)
      
      expect(response.status).toBe(400)
    })

    it('returns error when assigned agent not found', async () => {
      // Mock: first call for project (found), second call for agent (not found)
      let callCount = 0
      vi.mocked(db.select).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Project exists
          return createMockQuery(mockProject)
        } else {
          // Agent doesn't exist
          return createMockQuery([])
        }
      })

      const taskData = {
        title: 'New Task',
        projectId: 1,
        status: 'backlog',
        priority: 'medium',
        assignedAgent: 'nonexistent-agent'
      }

      const request = createMockRequest(mockUrl, 'POST', taskData)
      const response = await POST(request as any)
      
      expect(response.status).toBe(400)
    })

    it('handles validation errors for invalid task data', async () => {
      const invalidTaskData = {
        // Missing required fields
        description: 'Task without title'
      }

      const request = createMockRequest(mockUrl, 'POST', invalidTaskData)
      const response = await POST(request as any)
      
      expect(response.status).toBe(400)
    })

    it('handles invalid JSON in request body', async () => {
      const request = {
        url: mockUrl,
        method: 'POST',
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: vi.fn().mockResolvedValue('invalid json'),
      } as unknown as Request & { url: string }

      const response = await POST(request as any)
      
      expect(response.status).toBe(400)
    })
  })
})