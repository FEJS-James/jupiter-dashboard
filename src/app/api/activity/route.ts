import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activity, agents, projects, tasks } from '@/lib/schema'
import { desc, eq, and, like, gte, lte, or, isNotNull, sql } from 'drizzle-orm'
import { z, ZodError } from 'zod'
import { handleZodError, handleDatabaseError, createSuccessResponse, createCachedSuccessResponse } from '@/lib/api-utils'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  project: z.coerce.number().optional(),
  agent: z.coerce.number().optional(),
  activityType: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters - only include non-null values
    const queryParams: Record<string, string | number> = {}
    
    // Build query params object with only non-null values
    if (searchParams.get('page') !== null) {
      queryParams.page = searchParams.get('page')!
    }
    if (searchParams.get('limit') !== null) {
      queryParams.limit = searchParams.get('limit')!
    }
    if (searchParams.get('project') !== null) {
      queryParams.project = searchParams.get('project')!
    }
    if (searchParams.get('agent') !== null) {
      queryParams.agent = searchParams.get('agent')!
    }
    if (searchParams.get('activityType') !== null) {
      queryParams.activityType = searchParams.get('activityType')!
    }
    if (searchParams.get('search') !== null) {
      queryParams.search = searchParams.get('search')!
    }
    if (searchParams.get('startDate') !== null) {
      queryParams.startDate = searchParams.get('startDate')!
    }
    if (searchParams.get('endDate') !== null) {
      queryParams.endDate = searchParams.get('endDate')!
    }

    const parsed = querySchema.safeParse(queryParams)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { 
      page, 
      limit, 
      project: projectId, 
      agent: agentId,
      activityType,
      search, 
      startDate, 
      endDate 
    } = parsed.data

    // Build where conditions
    const conditions = []

    // Project filter
    if (projectId) {
      conditions.push(eq(activity.projectId, projectId))
    }

    // Agent filter
    if (agentId) {
      conditions.push(eq(activity.agentId, agentId))
    }

    // Activity type filter
    if (activityType) {
      conditions.push(eq(activity.action, activityType))
    }

    // Date range filters
    if (startDate) {
      conditions.push(gte(activity.timestamp, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(activity.timestamp, new Date(endDate)))
    }

    // Search filter (searches in action and details)
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`
      conditions.push(
        or(
          like(activity.action, searchPattern),
          like(sql`CAST(${activity.details} AS TEXT)`, searchPattern)
        )
      )
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Fetch activities with joins for related data
    const activitiesQuery = db
      .select({
        activity: activity,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
          avatarUrl: agents.avatarUrl,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
        task: {
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
        },
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .leftJoin(projects, eq(activity.projectId, projects.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activity.timestamp))
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset)

    const results = await activitiesQuery

    // Check if there are more results
    const hasMore = results.length > limit
    const activities = hasMore ? results.slice(0, limit) : results

    // Transform the results
    const transformedActivities = activities.map(result => ({
      id: result.activity.id,
      projectId: result.activity.projectId,
      taskId: result.activity.taskId,
      agentId: result.activity.agentId,
      action: result.activity.action,
      details: result.activity.details || {},
      timestamp: typeof result.activity.timestamp === 'number' ? new Date(result.activity.timestamp * 1000).toISOString() : (result.activity.timestamp instanceof Date ? result.activity.timestamp.toISOString() : String(result.activity.timestamp)),
      agent: result.agent?.id ? {
        id: result.agent.id,
        name: result.agent.name,
        role: result.agent.role,
        color: result.agent.color,
        avatarUrl: result.agent.avatarUrl,
      } : undefined,
      project: result.project?.id ? {
        id: result.project.id,
        name: result.project.name,
      } : undefined,
      task: result.task?.id ? {
        id: result.task.id,
        title: result.task.title,
        status: result.task.status,
      } : undefined,
    }))

    return createCachedSuccessResponse({
      data: transformedActivities,
      pagination: {
        page,
        limit,
        hasMore,
        total: null, // Don't calculate total for performance
      },
      hasMore, // Keep for backward compatibility
    }, undefined, { maxAge: 5, swr: 30 })

  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }
    
    return handleDatabaseError(error)
  }
}

// POST endpoint for creating new activity entries
const createActivitySchema = z.object({
  projectId: z.number().optional(),
  taskId: z.number().optional(),
  agentId: z.number().optional(),
  action: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse and validate request body
    const parsed = createActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { projectId, taskId, agentId, action, details } = parsed.data

    // Create the activity entry
    const [newActivity] = await db
      .insert(activity)
      .values({
        projectId,
        taskId,
        agentId,
        action,
        details: details || {},
      })
      .returning()

    // Fetch the complete activity with related data for response
    const completeActivity = await db
      .select({
        activity: activity,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
          avatarUrl: agents.avatarUrl,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
        task: {
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
        },
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .leftJoin(projects, eq(activity.projectId, projects.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .where(eq(activity.id, newActivity.id))
      .limit(1)

    const result = completeActivity[0]
    
    const transformedActivity = {
      id: result.activity.id,
      projectId: result.activity.projectId,
      taskId: result.activity.taskId,
      agentId: result.activity.agentId,
      action: result.activity.action,
      details: result.activity.details || {},
      timestamp: typeof result.activity.timestamp === 'number' ? new Date(result.activity.timestamp * 1000).toISOString() : (result.activity.timestamp instanceof Date ? result.activity.timestamp.toISOString() : String(result.activity.timestamp)),
      agent: result.agent?.id ? {
        id: result.agent.id,
        name: result.agent.name,
        role: result.agent.role,
        color: result.agent.color,
        avatarUrl: result.agent.avatarUrl,
      } : undefined,
      project: result.project?.id ? {
        id: result.project.id,
        name: result.project.name,
      } : undefined,
      task: result.task?.id ? {
        id: result.task.id,
        title: result.task.title,
        status: result.task.status,
      } : undefined,
    }

    return NextResponse.json({
      success: true,
      data: transformedActivity,
    }, { status: 201 })

  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }
    
    return handleDatabaseError(error)
  }
}

// DELETE endpoint for bulk activity cleanup (optional)
const deleteActivitySchema = z.object({
  olderThan: z.string().datetime().optional(),
  action: z.string().optional(),
  projectId: z.number().optional(),
})

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse and validate request body
    const parsed = deleteActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { olderThan, action: actionFilter, projectId } = parsed.data

    // Build where conditions for deletion
    const conditions = []

    if (olderThan) {
      conditions.push(lte(activity.timestamp, new Date(olderThan)))
    }

    if (actionFilter) {
      conditions.push(eq(activity.action, actionFilter))
    }

    if (projectId) {
      conditions.push(eq(activity.projectId, projectId))
    }

    // Require at least one condition to prevent accidental deletion of all activities
    if (conditions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one filter condition is required for bulk deletion'
      }, { status: 400 })
    }

    // Delete activities
    const result = await db
      .delete(activity)
      .where(and(...conditions))

    return NextResponse.json({
      success: true,
      message: `Activities deleted successfully`,
      deletedCount: result.rowsAffected || 0,
    })

  } catch (error) {
    console.error('Activity deletion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}