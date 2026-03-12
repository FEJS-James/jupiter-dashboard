import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GET, POST } from './route'
import { db } from '@/lib/db'
import { tasks, projects, agents } from '@/lib/schema'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}))

// Mock drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
}))

// Mock Request and NextRequest
const mockUrl = 'https://localhost:3000/api/tasks'
const createMockRequest = (url: string = mockUrl, method: string = 'GET', body?: any) => {
  const request = {
    url,
    method,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(body ? JSON.stringify(body) : ''),
  } as unknown as Request & { url: string }
  return request
}

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('returns all tasks when no filters applied', async () => {
      // Mock database query chain
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks)

      const request = createMockRequest()
      const response = await GET(request as any)
      
      expect(response).toBeDefined()
      expect(db.select).toHaveBeenCalled()
    })

    it('applies status filter when provided', async () => {
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks.filter(t => t.status === 'backlog'))

      const request = createMockRequest('https://localhost:3000/api/tasks?status=backlog')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
      expect(mockQuery.where).toHaveBeenCalled()
    })

    it('applies agent filter when provided', async () => {
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks.filter(t => t.assignedAgent === 'coder'))

      const request = createMockRequest('https://localhost:3000/api/tasks?agent=coder')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
      expect(mockQuery.where).toHaveBeenCalled()
    })

    it('applies priority filter when provided', async () => {
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks.filter(t => t.priority === 'high'))

      const request = createMockRequest('https://localhost:3000/api/tasks?priority=high')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
    })

    it('applies pagination when limit and offset provided', async () => {
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks)

      const request = createMockRequest('https://localhost:3000/api/tasks?limit=10&offset=5')
      const response = await GET(request as any)
      
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(mockQuery.offset).toHaveBeenCalledWith(5)
    })

    it('handles project filter by ID', async () => {
      const mockQuery = {
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      }
      
      vi.mocked(db.select).mockReturnValue(mockQuery as any)
      vi.mocked(mockQuery.leftJoin).mockResolvedValue(mockTasks.filter(t => t.projectId === 1))

      const request = createMockRequest('https://localhost:3000/api/tasks?project=1')
      const response = await GET(request as any)
      
      expect(db.select).toHaveBeenCalled()
    })
  })

  describe('POST /api/tasks', () => {
    const mockProject = [{ id: 1, name: 'Test Project' }]
    const mockAgent = [{ id: 1, name: 'coder', role: 'coder' }]

    beforeEach(() => {
      // Mock project existence check
      const projectQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockProject)
      }
      
      // Mock agent existence check
      const agentQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockAgent)
      }

      vi.mocked(db.select).mockImplementation(() => {
        let callCount = 0
        return {
          from: vi.fn(() => {
            callCount++
            if (callCount === 1) return projectQuery // First call for project
            return agentQuery // Second call for agent
          })
        } as any
      })
    })

    it('creates a new task with valid data', async () => {
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
      const emptyProjectQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]) // Empty array = not found
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue(emptyProjectQuery)
      } as any)

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
      // Mock agent not found
      const emptyAgentQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]) // Empty array = not found
      }

      vi.mocked(db.select).mockImplementation(() => {
        let callCount = 0
        return {
          from: vi.fn(() => {
            callCount++
            if (callCount === 1) {
              return {
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(mockProject)
              }
            }
            return emptyAgentQuery
          })
        } as any
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