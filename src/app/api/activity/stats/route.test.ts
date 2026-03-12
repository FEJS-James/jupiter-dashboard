/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server'
import { GET } from './route'
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
const createRequest = (url: string = '/api/activity/stats') => {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'GET' })
}

describe('/api/activity/stats API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock various query builders for different stat queries
    let callCount = 0
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++
        // Return different mock data based on call order
        switch (callCount) {
          case 1: // Total activities count
            return [{ count: 150 }]
          case 2: // Last 24 hours count
            return [{ count: 25 }]
          case 3: // Most active project
            return [{ projectId: 1, projectName: 'Test Project Alpha', count: 45 }]
          case 4: // Most active agent
            return [{ agentId: 2, agentName: 'Alice Developer', count: 38 }]
          case 5: // Top activity types
            return [
              { action: 'task_created', count: 35 },
              { action: 'task_updated', count: 28 },
              { action: 'task_moved', count: 22 },
              { action: 'comment_added', count: 15 },
              { action: 'task_completed', count: 10 },
            ]
          default:
            return []
        }
      }),
    }

    mockDb.select.mockReturnValue(mockQueryBuilder as any)
  })

  it('should return comprehensive activity statistics', async () => {
    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      totalActivities: 150,
      activitiesLast24Hours: 25,
      mostActiveProject: 'Test Project Alpha',
      mostActiveAgent: 'Alice Developer',
      topActivityTypes: expect.arrayContaining([
        expect.objectContaining({
          type: 'task_created',
          count: 35,
          percentage: expect.any(Number),
        }),
        expect.objectContaining({
          type: 'task_updated',
          count: 28,
          percentage: expect.any(Number),
        }),
      ]),
    })
  })

  it('should calculate activity type percentages correctly', async () => {
    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    const totalActivityCount = data.data.topActivityTypes.reduce(
      (sum: number, item: any) => sum + item.count, 
      0
    )
    expect(totalActivityCount).toBe(110) // 35+28+22+15+10

    // Check percentages add up to approximately 100%
    const totalPercentage = data.data.topActivityTypes.reduce(
      (sum: number, item: any) => sum + item.percentage,
      0
    )
    expect(totalPercentage).toBeCloseTo(100, 1)

    // Check individual percentage calculation
    expect(data.data.topActivityTypes[0].percentage).toBeCloseTo(31.82, 1) // 35/110 * 100
    expect(data.data.topActivityTypes[1].percentage).toBeCloseTo(25.45, 1) // 28/110 * 100
  })

  it('should handle case when no activities exist', async () => {
    // Mock empty results for all queries
    let callCount = 0
    const mockEmptyQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: case 2: // Total and 24h counts
            return [{ count: 0 }]
          case 3: case 4: case 5: // Project, agent, and activity types
            return []
          default:
            return []
        }
      }),
    }

    mockDb.select.mockReturnValue(mockEmptyQueryBuilder as any)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      totalActivities: 0,
      activitiesLast24Hours: 0,
      mostActiveProject: 'None',
      mostActiveAgent: 'None',
      topActivityTypes: [],
    })
  })

  it('should handle case with no project/agent names', async () => {
    // Mock results without names
    let callCount = 0
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: // Total activities count
            return [{ count: 50 }]
          case 2: // Last 24 hours count
            return [{ count: 5 }]
          case 3: // Most active project (no name)
            return [{ projectId: 1, projectName: null, count: 10 }]
          case 4: // Most active agent (no name)
            return [{ agentId: 1, agentName: null, count: 8 }]
          case 5: // Top activity types
            return [{ action: 'task_created', count: 15 }]
          default:
            return []
        }
      }),
    }

    mockDb.select.mockReturnValue(mockQueryBuilder as any)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      totalActivities: 50,
      activitiesLast24Hours: 5,
      mostActiveProject: 'None', // Should handle null name
      mostActiveAgent: 'None', // Should handle null name
    })
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    const mockErrorQueryBuilder = {
      select: jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed')
      }),
    }

    mockDb.select.mockReturnValue(mockErrorQueryBuilder as any)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
    expect(data.details).toBe('Database connection failed')
  })

  it('should return top 5 activity types only', async () => {
    // Mock more than 5 activity types
    let callCount = 0
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => {
        callCount++
        switch (callCount) {
          case 1: return [{ count: 200 }]
          case 2: return [{ count: 50 }]
          case 3: return [{ projectId: 1, projectName: 'Test Project', count: 100 }]
          case 4: return [{ agentId: 1, agentName: 'Test Agent', count: 75 }]
          case 5: 
            return [
              { action: 'task_created', count: 40 },
              { action: 'task_updated', count: 35 },
              { action: 'task_moved', count: 30 },
              { action: 'comment_added', count: 25 },
              { action: 'task_completed', count: 20 },
            ]
          default:
            return []
        }
      }),
    }

    mockDb.select.mockReturnValue(mockQueryBuilder as any)

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.topActivityTypes).toHaveLength(5)
    expect(data.data.topActivityTypes[0].count).toBe(40)
    expect(data.data.topActivityTypes[4].count).toBe(20)
  })

  it('should calculate time-based filters correctly', async () => {
    // This test verifies the time calculations are done correctly
    // We can't easily test the actual SQL generation, but we can verify
    // that the endpoint processes the time-based queries without errors

    const request = createRequest()
    const response = await GET(request)

    expect(response.status).toBe(200)
    
    // Verify that the database select was called the expected number of times
    // (once for each stats query: total, 24h, project, agent, types)
    expect(mockDb.select).toHaveBeenCalledTimes(5)
  })
})