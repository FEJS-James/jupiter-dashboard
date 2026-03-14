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
  // Helper to create a query builder that resolves to given data when awaited
  // Drizzle query chains are thenable — the final method in the chain resolves the promise
  const createMockBuilder = (results: any[]) => {
    let callCount = 0
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation(function(this: any) { 
        callCount++
        // Queries 1 & 2 end at from/where (no limit), so make them thenable
        this._currentResult = results[callCount - 1] || []
        return this
      }),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(function(this: any) {
        return this
      }),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(function(this: any) {
        return this._currentResult
      }),
      // Make thenable so `await db.select().from()` resolves correctly
      then: vi.fn().mockImplementation(function(this: any, resolve: any) {
        return resolve(this._currentResult)
      }),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // 5 sequential db.select() calls in the stats route:
    // 1. Total count (no limit) 2. 24h count (no limit)
    // 3. Most active project (limit 1) 4. Most active agent (limit 1) 
    // 5. Top activity types (limit 5)
    let selectCallCount = 0
    const queryResults = [
      [{ count: 150 }],                    // Total activities
      [{ count: 25 }],                     // Last 24 hours
      [{ projectId: 1, projectName: 'Test Project Alpha', count: 45 }],  // Most active project
      [{ agentId: 2, agentName: 'Alice Developer', count: 38 }],        // Most active agent
      [                                     // Top activity types
        { action: 'task_created', count: 35 },
        { action: 'task_updated', count: 28 },
        { action: 'task_moved', count: 22 },
        { action: 'comment_added', count: 15 },
        { action: 'task_completed', count: 10 },
      ],
    ]

    mockDb.select.mockImplementation(() => {
      const result = queryResults[selectCallCount] || []
      selectCallCount++
      
      // Create a chainable builder that resolves to the correct result
      const builder: any = {
        from: vi.fn().mockReturnValue(undefined as any), // will be set below
        leftJoin: vi.fn(),
        where: vi.fn(),
        groupBy: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn().mockReturnValue(result),
      }
      // Each chainable method returns builder for chaining
      builder.from.mockReturnValue(builder)
      builder.leftJoin.mockReturnValue(builder)
      builder.where.mockReturnValue(builder)
      builder.groupBy.mockReturnValue(builder)
      builder.orderBy.mockReturnValue(builder)
      
      // Make builder thenable so `await db.select().from()` works for queries without .limit()
      builder.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
      
      return builder
    })
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
    // Override mock with empty results
    let selectCallCount = 0
    const emptyResults = [
      [{ count: 0 }], [{ count: 0 }], [], [], [],
    ]
    mockDb.select.mockImplementation(() => {
      const result = emptyResults[selectCallCount] || []
      selectCallCount++
      const builder: any = {
        from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(),
        groupBy: vi.fn(), orderBy: vi.fn(),
        limit: vi.fn().mockReturnValue(result),
      }
      builder.from.mockReturnValue(builder)
      builder.leftJoin.mockReturnValue(builder)
      builder.where.mockReturnValue(builder)
      builder.groupBy.mockReturnValue(builder)
      builder.orderBy.mockReturnValue(builder)
      builder.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
      return builder
    })

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
    // Override with results that have null names
    let selectCallCount = 0
    const nullNameResults = [
      [{ count: 50 }], [{ count: 5 }],
      [{ projectId: 1, projectName: null, count: 10 }],
      [{ agentId: 1, agentName: null, count: 8 }],
      [{ action: 'task_created', count: 15 }],
    ]
    mockDb.select.mockImplementation(() => {
      const result = nullNameResults[selectCallCount] || []
      selectCallCount++
      const builder: any = {
        from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(),
        groupBy: vi.fn(), orderBy: vi.fn(),
        limit: vi.fn().mockReturnValue(result),
      }
      builder.from.mockReturnValue(builder)
      builder.leftJoin.mockReturnValue(builder)
      builder.where.mockReturnValue(builder)
      builder.groupBy.mockReturnValue(builder)
      builder.orderBy.mockReturnValue(builder)
      builder.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
      return builder
    })

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
    // Mock database error on first select call
    mockDb.select.mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
    expect(data.details).toBe('Database connection failed')
  })

  it('should return top 5 activity types only', async () => {
    let selectCallCount = 0
    const top5Results = [
      [{ count: 200 }], [{ count: 50 }],
      [{ projectId: 1, projectName: 'Test Project', count: 100 }],
      [{ agentId: 1, agentName: 'Test Agent', count: 75 }],
      [
        { action: 'task_created', count: 40 },
        { action: 'task_updated', count: 35 },
        { action: 'task_moved', count: 30 },
        { action: 'comment_added', count: 25 },
        { action: 'task_completed', count: 20 },
      ],
    ]
    mockDb.select.mockImplementation(() => {
      const result = top5Results[selectCallCount] || []
      selectCallCount++
      const builder: any = {
        from: vi.fn(), leftJoin: vi.fn(), where: vi.fn(),
        groupBy: vi.fn(), orderBy: vi.fn(),
        limit: vi.fn().mockReturnValue(result),
      }
      builder.from.mockReturnValue(builder)
      builder.leftJoin.mockReturnValue(builder)
      builder.where.mockReturnValue(builder)
      builder.groupBy.mockReturnValue(builder)
      builder.orderBy.mockReturnValue(builder)
      builder.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
      return builder
    })

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