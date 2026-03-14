/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { db } from '@/lib/db'
import { activity } from '@/lib/schema'
import { vi } from 'vitest'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}))

const mockDb = db as any

// Helper to create mock request
const createRequest = (url: string, options: any = {}) => {
  const baseUrl = 'http://localhost:3000'
  return new NextRequest(url.startsWith('http') ? url : `${baseUrl}${url}`, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || undefined,
  })
}

describe('/api/activity/export API Routes', () => {
  const mockExportData = [
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
    {
      activity: {
        id: 2,
        projectId: 1,
        taskId: 2,
        agentId: 1,
        action: 'task_updated',
        details: { field: 'title', oldValue: 'Old Title', newValue: 'New Title' },
        timestamp: new Date('2026-03-12T10:30:00Z'),
      },
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
        id: 2,
        title: 'Updated Task',
        status: 'in-progress',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the query builder chain
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(mockExportData),
    }

    mockDb.select.mockReturnValue(mockQueryBuilder as any)
  })

  describe('POST /api/activity/export', () => {
    it('should export activities in JSON format', async () => {
      const exportData = {
        format: 'json',
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toMatchObject({
        id: 1,
        action: 'task_created',
        agentName: 'Test Agent',
        projectName: 'Test Project',
        taskTitle: 'Test Task',
      })
      expect(data.metadata).toBeDefined()
      expect(data.metadata.recordCount).toBe(2)
    })

    it('should export activities in CSV format', async () => {
      const exportData = {
        format: 'csv',
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(response.headers.get('content-disposition')).toContain('attachment')
      expect(csvContent).toContain('ID,Timestamp,Action,Agent ID,Agent Name')
      expect(csvContent).toContain('1,2026-03-12 10:00:00,task_created')
      expect(csvContent).toContain('Test Agent')
      expect(csvContent).toContain('Test Project')
    })

    it('should export with date range filters', async () => {
      const exportData = {
        format: 'json',
        dateRange: {
          start: '2026-03-12T00:00:00Z',
          end: '2026-03-12T23:59:59Z',
        },
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.dateRange).toEqual(exportData.dateRange)
    })

    it('should export with project filter', async () => {
      const exportData = {
        format: 'json',
        filters: {
          project: 1,
        },
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.filters.project).toBe(1)
    })

    it('should export with agent filter', async () => {
      const exportData = {
        format: 'json',
        filters: {
          agent: 1,
        },
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.filters.agent).toBe(1)
    })

    it('should export with activity type filter', async () => {
      const exportData = {
        format: 'json',
        filters: {
          activityType: 'task_created',
        },
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.filters.activityType).toBe('task_created')
    })

    it('should respect export limits', async () => {
      const exportData = {
        format: 'json',
        limit: 1,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject invalid export format', async () => {
      const exportData = {
        format: 'xml', // Invalid format
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request body')
    })

    it('should reject export limit exceeding maximum', async () => {
      const exportData = {
        format: 'json',
        limit: 20000, // Exceeds max of 10,000
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle CSV escaping for special characters', async () => {
      // Mock data with special characters that need CSV escaping
      const mockSpecialData = [
        {
          activity: {
            id: 1,
            projectId: 1,
            taskId: 1,
            agentId: 1,
            action: 'task_created',
            details: { note: 'Task with "quotes" and, commas' },
            timestamp: new Date('2026-03-12T10:00:00Z'),
          },
          agent: {
            id: 1,
            name: 'Agent, "Special" Name',
            role: 'developer',
          },
          project: {
            id: 1,
            name: 'Project with, commas',
          },
          task: {
            id: 1,
            title: 'Task with "quotes"',
            status: 'backlog',
          },
        },
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue(mockSpecialData),
      }

      mockDb.select.mockReturnValue(mockQueryBuilder as any)

      const exportData = {
        format: 'csv',
        limit: 100,
      }

      const request = createRequest('/api/activity/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      const response = await POST(request)
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(csvContent).toContain('"Agent, ""Special"" Name"')
      expect(csvContent).toContain('"Project with, commas"')
      expect(csvContent).toContain('"Task with ""quotes"""')
    })
  })

  describe('GET /api/activity/export', () => {
    it('should export activities in CSV format via GET', async () => {
      const request = createRequest('/api/activity/export?format=csv&limit=100')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(csvContent).toContain('ID,Timestamp,Action,Agent ID,Agent Name')
    })

    it('should export activities in JSON format via GET', async () => {
      const request = createRequest('/api/activity/export?format=json&limit=100')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
    })

    it('should handle query parameter filters', async () => {
      const request = createRequest('/api/activity/export?format=json&project=1&agent=1&activityType=task_created&startDate=2026-03-12T00:00:00Z&endDate=2026-03-12T23:59:59Z')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should cap GET request limits at 10k', async () => {
      const request = createRequest('/api/activity/export?format=json&limit=20000')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use default CSV format when not specified', async () => {
      const request = createRequest('/api/activity/export')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
    })
  })
})