/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from './route'
import { db } from '@/lib/db'
import { activity, agents, projects, tasks } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { vi } from 'vitest'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockDb = db as any

// Mock websocket manager
vi.mock('@/lib/websocket-manager', () => ({
  websocketManager: {
    isReady: () => true,
    getIO: () => ({
      emit: vi.fn(),
    }),
  },
}))

// Helper to create mock request
const createRequest = (url: string, options: any = {}) => {
  const baseUrl = 'http://localhost:3000'
  return new NextRequest(url.startsWith('http') ? url : `${baseUrl}${url}`, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || undefined,
  })
}

describe('/api/activity API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/activity', () => {
    const mockActivityData = [
      {
        activity: {
          id: 1,
          projectId: 1,
          taskId: 1,
          agentId: 1,
          action: 'task_created',
          details: { priority: 'high' },
          timestamp: new Date('2026-03-12T10:00:00Z'),
        },
        agent: {
          id: 1,
          name: 'Test Agent',
          role: 'developer',
          color: '#3b82f6',
          avatarUrl: null,
        },
        project: {
          id: 1,
          name: 'Test Project',
        },
        task: {
          id: 1,
          title: 'Test Task',
          status: 'backlog',
        },
      },
    ]

    beforeEach(() => {
      // Mock the query builder chain
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnValue(mockActivityData),
      }

      mockDb.select.mockReturnValue(mockQueryBuilder as any)
    })

    it('should return paginated activities with default parameters', async () => {
      const request = createRequest('/api/activity')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0]).toMatchObject({
        id: 1,
        action: 'task_created',
        agent: {
          id: 1,
          name: 'Test Agent',
          role: 'developer',
        },
        project: {
          id: 1,
          name: 'Test Project',
        },
        task: {
          id: 1,
          title: 'Test Task',
          status: 'backlog',
        },
      })
    })

    it('should handle pagination parameters correctly', async () => {
      const request = createRequest('/api/activity?page=2&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })

    it('should handle project filter', async () => {
      const request = createRequest('/api/activity?project=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle agent filter', async () => {
      const request = createRequest('/api/activity?agent=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle activity type filter', async () => {
      const request = createRequest('/api/activity?activityType=task_created')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle date range filters', async () => {
      const startDate = '2026-03-01T00:00:00Z'
      const endDate = '2026-03-31T23:59:59Z'
      const request = createRequest(`/api/activity?startDate=${startDate}&endDate=${endDate}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle search filter', async () => {
      const request = createRequest('/api/activity?search=task')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle multiple filters combined', async () => {
      const request = createRequest('/api/activity?project=1&agent=1&activityType=task_created&search=test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject invalid pagination parameters', async () => {
      const request = createRequest('/api/activity?page=-1&limit=0')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should reject invalid date formats', async () => {
      const request = createRequest('/api/activity?startDate=invalid-date')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/activity', () => {
    const mockNewActivity = {
      id: 1,
      projectId: 1,
      taskId: 1,
      agentId: 1,
      action: 'task_created',
      details: { priority: 'high' },
      timestamp: new Date('2026-03-12T10:00:00Z'),
    }

    beforeEach(() => {
      // Mock insert chain
      const mockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnValue([mockNewActivity]),
      }

      mockDb.insert.mockReturnValue(mockInsertBuilder as any)

      // Mock select for fetching complete activity (also used for validation and complete activity fetch)
      let selectCallCount = 0
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount <= 3) {
            // Validation calls (project, task, agent exist)
            return [{ id: 1 }]
          } else {
            // Complete activity fetch
            return [{
              activity: mockNewActivity,
              agent: { id: 1, name: 'Test Agent', role: 'developer', color: '#3b82f6', avatarUrl: null },
              project: { id: 1, name: 'Test Project' },
              task: { id: 1, title: 'Test Task', status: 'backlog' },
            }]
          }
        }),
      }

      mockDb.select.mockReturnValue(mockSelectBuilder as any)
    })

    it('should create new activity successfully', async () => {
      const activityData = {
        projectId: 1,
        taskId: 1,
        agentId: 1,
        action: 'task_created',
        details: { priority: 'high' },
      }

      const request = createRequest('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('task_created')
      expect(data.data.details.priority).toBe('high')
    })

    it('should create activity with minimal data', async () => {
      // Update mock to return system_event for this test
      const systemEventActivity = {
        ...mockNewActivity,
        action: 'system_event',
        projectId: undefined,
        taskId: undefined,
      }

      const mockInsertBuilder = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnValue([systemEventActivity]),
      }

      mockDb.insert.mockReturnValue(mockInsertBuilder as any)

      // Mock select for system event (no related entities)
      let selectCallCount = 0
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          // No validation calls needed for system events
          return [{
            activity: systemEventActivity,
            agent: null,
            project: null,
            task: null,
          }]
        }),
      }

      mockDb.select.mockReturnValue(mockSelectBuilder as any)

      const activityData = {
        action: 'system_event',
      }

      const request = createRequest('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.action).toBe('system_event')
    })

    it('should reject invalid activity data', async () => {
      const activityData = {
        // Missing required 'action' field
        projectId: 1,
      }

      const request = createRequest('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request body')
    })

    it('should handle malformed JSON', async () => {
      const request = createRequest('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      })

      const response = await POST(request)
      const data = await response.json()

      // API returns 500 for JSON parse errors (handled by database error handler)
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('DELETE /api/activity', () => {
    beforeEach(() => {
      // Mock delete chain
      const mockDeleteBuilder = {
        where: vi.fn().mockReturnThis(),
      }

      mockDb.delete.mockReturnValue(mockDeleteBuilder as any)
    })

    it('should delete activities with olderThan filter', async () => {
      const deleteData = {
        olderThan: '2026-03-01T00:00:00Z',
      }

      const request = createRequest('/api/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should delete activities with action filter', async () => {
      const deleteData = {
        action: 'task_created',
      }

      const request = createRequest('/api/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should delete activities with project filter', async () => {
      const deleteData = {
        projectId: 1,
      }

      const request = createRequest('/api/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject deletion without any filters', async () => {
      const deleteData = {}

      const request = createRequest('/api/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('At least one filter condition is required for bulk deletion')
    })

    it('should handle invalid date format in olderThan', async () => {
      const deleteData = {
        olderThan: 'invalid-date',
      }

      const request = createRequest('/api/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})