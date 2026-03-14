import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, agents, projects, activity } from '@/lib/schema'
import { count, sql, eq, gte, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Input validation
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
    }
    
    // Build separate date filters for creation and completion metrics
    let creationFilter = undefined
    let completionFilter = undefined
    
    if (startDate || endDate) {
      if (startDate) {
        creationFilter = sql`${tasks.createdAt} >= ${new Date(startDate).toISOString()}`
        completionFilter = sql`${tasks.updatedAt} >= ${new Date(startDate).toISOString()}`
      }
      if (endDate) {
        const endCreationFilter = sql`${tasks.createdAt} <= ${new Date(endDate).toISOString()}`
        const endCompletionFilter = sql`${tasks.updatedAt} <= ${new Date(endDate).toISOString()}`
        
        creationFilter = creationFilter 
          ? and(creationFilter, endCreationFilter) 
          : endCreationFilter
        completionFilter = completionFilter 
          ? and(completionFilter, endCompletionFilter) 
          : endCompletionFilter
      }
    }

    // Total tasks (based on creation date)
    const totalTasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(creationFilter)
    
    const totalTasks = totalTasksResult[0]?.count || 0

    // Completed tasks (based on completion date)
    const completedTasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        completionFilter 
          ? and(eq(tasks.status, 'done'), completionFilter)
          : eq(tasks.status, 'done')
      )
    
    const completedTasks = completedTasksResult[0]?.count || 0

    // In-progress tasks (based on creation date)
    const inProgressResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        creationFilter 
          ? and(eq(tasks.status, 'in-progress'), creationFilter)
          : eq(tasks.status, 'in-progress')
      )
    
    const inProgressTasks = inProgressResult[0]?.count || 0

    // Average completion time (for completed tasks, based on completion date)
    const avgCompletionResult = await db
      .select({
        avgDays: sql<number>`AVG((julianday(${tasks.updatedAt}) - julianday(${tasks.createdAt})))`
      })
      .from(tasks)
      .where(
        completionFilter 
          ? and(eq(tasks.status, 'done'), completionFilter)
          : eq(tasks.status, 'done')
      )
    
    const avgCompletionTime = avgCompletionResult[0]?.avgDays || 0

    // Active projects
    const activeProjectsResult = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'active'))
    
    const activeProjects = activeProjectsResult[0]?.count || 0

    // Active agents
    const activeAgentsResult = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.status, 'available'))
    
    const activeAgents = activeAgentsResult[0]?.count || 0

    // Completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const overview = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // Round to 1 decimal
      activeProjects,
      activeAgents
    }

    return NextResponse.json({
      success: true,
      data: overview,
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    })

  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}