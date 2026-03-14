import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { tasks } from '@/lib/schema'

// Mock the database
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  }
  return { db: mockDb }
})

// Mock drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  ne: vi.fn((field, value) => ({ field, value, type: 'ne' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  like: vi.fn((field, value) => ({ field, value, type: 'like' })),
  inArray: vi.fn((field, values) => ({ field, values, type: 'inArray' })),
  sql: vi.fn((strings: any, ...values: any[]) => ({ strings, values, type: 'sql' })),
  relations: vi.fn((table: any, callback: any) => ({ table, callback, type: 'relations' })),
}))

// Mock websocket manager
vi.mock('@/lib/websocket-manager', () => ({
  websocketManager: {
    emitTaskCreated: vi.fn(),
    emitTaskUpdated: vi.fn(),
    emitBulkOperation: vi.fn(),
    emitBulkTasksUpdated: vi.fn(),
    isReady: vi.fn(() => false),
    getIO: vi.fn(() => null),
  },
}))

// Mock activity logger
vi.mock('@/lib/activity-logger', () => ({
  ActivityLogger: {
    logTaskCreated: vi.fn().mockResolvedValue(undefined),
    logTaskUpdated: vi.fn().mockResolvedValue(undefined),
    logTaskMoved: vi.fn().mockResolvedValue(undefined),
    logTaskAssigned: vi.fn().mockResolvedValue(undefined),
    logTaskDeleted: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock notification service
vi.mock('@/lib/notification-service', () => ({
  NotificationService: {
    notifyTaskAssigned: vi.fn().mockResolvedValue(undefined),
    notifyProjectTaskAdded: vi.fn().mockResolvedValue(undefined),
    notifyTaskStatusChanged: vi.fn().mockResolvedValue(undefined),
  },
}))

// Helper to create a chainable mock query
const createMockQuery = (finalResult: any = []) => {
  const query: any = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    orderBy: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  }

  query.from.mockReturnValue(query)
  query.leftJoin.mockReturnValue(query)
  query.orderBy.mockReturnValue(query)
  query.where.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.offset.mockReturnValue(query)

  Object.assign(query, {
    then: (resolve: any) => resolve(finalResult),
    catch: (reject: any) => Promise.resolve(finalResult).catch(reject),
    finally: (fn: any) => Promise.resolve(finalResult).finally(fn),
  })

  return query
}

// ─── Test data ────────────────────────────────────────────
const activeTasks = [
  { id: 1, projectId: 1, title: 'Active Task', status: 'in-progress', priority: 'high', assignedAgent: 'coder', tags: null, dueDate: null, effort: null, dependencies: null, createdAt: new Date(), updatedAt: new Date(), project: { id: 1, name: 'P1', status: 'active' }, agent: null },
]
const archivedTasks = [
  { id: 2, projectId: 1, title: 'Archived Task', status: 'archived', priority: 'low', assignedAgent: null, tags: null, dueDate: null, effort: null, dependencies: null, createdAt: new Date(), updatedAt: new Date(), project: { id: 1, name: 'P1', status: 'active' }, agent: null },
]
const allTasks = [...activeTasks, ...archivedTasks]

// ═══════════════════════════════════════════════════════════
// GET /api/tasks — archive exclusion / inclusion
// ═══════════════════════════════════════════════════════════
describe('Archive System — GET /api/tasks', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import so mocks are wired first
    const mod = await import('@/app/api/tasks/route')
    GET = mod.GET
  })

  it('excludes archived tasks by default (no includeArchived param)', async () => {
    const mockQuery = createMockQuery(activeTasks)
    vi.mocked(db.select).mockReturnValue(mockQuery as any)

    const { ne } = await import('drizzle-orm')

    const request = { url: 'https://localhost:3000/api/tasks' } as any
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    // ne should have been called to exclude 'archived'
    expect(ne).toHaveBeenCalledWith(tasks.status, 'archived')
    // where should have been called (to apply the ne condition)
    expect(mockQuery.where).toHaveBeenCalled()
  })

  it('includes archived tasks when includeArchived=true', async () => {
    const mockQuery = createMockQuery(allTasks)
    vi.mocked(db.select).mockReturnValue(mockQuery as any)

    const { ne } = await import('drizzle-orm')

    const request = { url: 'https://localhost:3000/api/tasks?includeArchived=true' } as any
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    // ne should NOT have been called — we want all statuses
    expect(ne).not.toHaveBeenCalled()
  })

  it('does not add ne filter when explicit status filter is given', async () => {
    const mockQuery = createMockQuery(archivedTasks)
    vi.mocked(db.select).mockReturnValue(mockQuery as any)

    const { ne, eq } = await import('drizzle-orm')

    const request = { url: 'https://localhost:3000/api/tasks?status=archived' } as any
    const response = await GET(request)

    expect(response.status).toBe(200)
    // When filtering by explicit status, ne should not be added
    expect(ne).not.toHaveBeenCalled()
    // eq should be used for the explicit status filter
    expect(eq).toHaveBeenCalledWith(tasks.status, 'archived')
  })
})

// ═══════════════════════════════════════════════════════════
// GET /api/tasks/archived — dedicated endpoint
// ═══════════════════════════════════════════════════════════
describe('Archive System — GET /api/tasks/archived', () => {
  let GET: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/tasks/archived/route')
    GET = mod.GET
  })

  it('returns archived tasks with total count and pagination', async () => {
    // First select for count, second for actual data
    const countQuery = createMockQuery([{ count: 5 }])
    const dataQuery = createMockQuery(archivedTasks)

    let callIdx = 0
    vi.mocked(db.select).mockImplementation(() => {
      callIdx++
      return (callIdx === 1 ? countQuery : dataQuery) as any
    })

    const request = { url: 'https://localhost:3000/api/tasks/archived' } as any
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('tasks')
    expect(body.data).toHaveProperty('total')
    expect(body.data).toHaveProperty('limit')
    expect(body.data).toHaveProperty('offset')
  })

  it('applies search filter to archived tasks', async () => {
    const countQuery = createMockQuery([{ count: 1 }])
    const dataQuery = createMockQuery(archivedTasks)

    let callIdx = 0
    vi.mocked(db.select).mockImplementation(() => {
      callIdx++
      return (callIdx === 1 ? countQuery : dataQuery) as any
    })

    const { like } = await import('drizzle-orm')

    const request = { url: 'https://localhost:3000/api/tasks/archived?search=Archived' } as any
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(like).toHaveBeenCalled()
  })

  it('applies priority filter to archived tasks', async () => {
    const countQuery = createMockQuery([{ count: 1 }])
    const dataQuery = createMockQuery(archivedTasks)

    let callIdx = 0
    vi.mocked(db.select).mockImplementation(() => {
      callIdx++
      return (callIdx === 1 ? countQuery : dataQuery) as any
    })

    const { eq } = await import('drizzle-orm')

    const request = { url: 'https://localhost:3000/api/tasks/archived?priority=low' } as any
    const response = await GET(request)

    expect(response.status).toBe(200)
    // eq is called at minimum for the archived status filter + priority filter
    expect(eq).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /api/tasks/bulk?operation=archive — bulk archive
// ═══════════════════════════════════════════════════════════
describe('Archive System — Bulk archive operation', () => {
  let POST: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/tasks/bulk/route')
    POST = mod.POST
  })

  it('archives multiple tasks via bulk operation', async () => {
    const existing = [
      { id: 10, projectId: 1, title: 'Done A', status: 'done' },
      { id: 11, projectId: 1, title: 'Done B', status: 'done' },
    ]
    const updated = existing.map(t => ({ ...t, status: 'archived' }))

    vi.mocked(db.transaction).mockImplementation(async (cb: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(existing),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(updated),
            }),
          }),
        }),
      }
      return cb(tx)
    })

    const request = new Request('http://localhost/api/tasks/bulk?operation=archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: [10, 11] }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toContain('archived 2 tasks')
  })

  it('rejects bulk archive with empty taskIds', async () => {
    const request = new Request('http://localhost/api/tasks/bulk?operation=archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════
// Validation — archived status accepted everywhere
// ═══════════════════════════════════════════════════════════
describe('Archive System — Validation schemas', () => {
  it('createTaskSchema accepts archived as a valid status', async () => {
    const { createTaskSchema } = await import('@/lib/validation')
    const result = createTaskSchema.safeParse({
      title: 'Test',
      projectId: 1,
      priority: 'medium',
      status: 'archived',
    })
    expect(result.success).toBe(true)
  })

  it('updateTaskSchema accepts archived as a valid status', async () => {
    const { updateTaskSchema } = await import('@/lib/validation')
    const result = updateTaskSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(true)
  })

  it('taskFiltersSchema accepts archived as a status filter', async () => {
    const { taskFiltersSchema } = await import('@/lib/validation')
    const result = taskFiltersSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(true)
  })

  it('moveTaskSchema accepts archived as target status', async () => {
    const { moveTaskSchema } = await import('@/lib/validation')
    const result = moveTaskSchema.safeParse({ status: 'archived' })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════
// Types — archived in TaskStatus
// ═══════════════════════════════════════════════════════════
describe('Archive System — Types', () => {
  it('TaskStatus type includes archived in validation', async () => {
    // Verify 'archived' is accepted by parsing it through the schema
    const { createTaskSchema } = await import('@/lib/validation')
    const result = createTaskSchema.safeParse({
      title: 'Type check',
      projectId: 1,
      priority: 'low',
      status: 'archived',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('archived')
    }
  })
})
