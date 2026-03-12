import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, agents, projects, activity } from '@/lib/schema'
import { count, sql, eq, gte, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Build date filter
    let dateFilter = undefined
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      dateFilter = and(
        sql`${tasks.createdAt} >= ${start.toISOString()}`,
        sql`${tasks.updatedAt} <= ${end.toISOString()}`
      )
    }

    // Total tasks
    const totalTasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(dateFilter)
    
    const totalTasks = totalTasksResult[0]?.count || 0

    // Completed tasks
    const completedTasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        dateFilter 
          ? and(eq(tasks.status, 'done'), dateFilter)
          : eq(tasks.status, 'done')
      )
    
    const completedTasks = completedTasksResult[0]?.count || 0

    // In-progress tasks
    const inProgressResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        dateFilter 
          ? and(eq(tasks.status, 'in-progress'), dateFilter)
          : eq(tasks.status, 'in-progress')
      )
    
    const inProgressTasks = inProgressResult[0]?.count || 0

    // Average completion time (for completed tasks)
    const avgCompletionResult = await db
      .select({
        avgDays: sql<number>`AVG((julianday(${tasks.updatedAt}) - julianday(${tasks.createdAt})))`
      })
      .from(tasks)
      .where(
        dateFilter 
          ? and(eq(tasks.status, 'done'), dateFilter)
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