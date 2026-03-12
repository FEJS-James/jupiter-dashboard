import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/schema'
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

    // Completion rate by priority
    const priorities = ['low', 'medium', 'high', 'urgent']
    const completionByPriority = []

    for (const priority of priorities) {
      const totalResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          dateFilter 
            ? and(eq(tasks.priority, priority as any), dateFilter)
            : eq(tasks.priority, priority as any)
        )

      const completedResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          dateFilter 
            ? and(eq(tasks.priority, priority as any), eq(tasks.status, 'done'), dateFilter)
            : and(eq(tasks.priority, priority as any), eq(tasks.status, 'done'))
        )

      const total = totalResult[0]?.count || 0
      const completed = completedResult[0]?.count || 0
      const rate = total > 0 ? (completed / total) * 100 : 0

      completionByPriority.push({
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        total,
        completed,
        rate: Math.round(rate * 100) / 100
      })
    }

    // Completion rate by project  
    const completionByProject = await db
      .select({
        projectId: tasks.projectId,
        projectName: projects.name,
        total: count(),
        completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END)`
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(dateFilter)
      .groupBy(tasks.projectId, projects.name)
      .orderBy(projects.name)

    const projectCompletionData = completionByProject.map(project => ({
      projectName: project.projectName || 'Unknown Project',
      total: project.total,
      completed: Number(project.completed),
      rate: project.total > 0 ? Math.round((Number(project.completed) / project.total) * 10000) / 100 : 0
    }))

    // Status distribution (funnel)
    const statusDistribution = await db
      .select({
        status: tasks.status,
        count: count()
      })
      .from(tasks)
      .where(dateFilter)
      .groupBy(tasks.status)
      .orderBy(tasks.status)

    const statusData = statusDistribution.map(item => ({
      status: item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' '),
      count: item.count,
      percentage: 0 // Will calculate below
    }))

    const totalStatusTasks = statusData.reduce((sum, item) => sum + item.count, 0)
    statusData.forEach(item => {
      item.percentage = totalStatusTasks > 0 ? Math.round((item.count / totalStatusTasks) * 10000) / 100 : 0
    })

    // Time to completion distribution
    const completionTimeData = await db
      .select({
        taskId: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        daysToComplete: sql<number>`ROUND(julianday(${tasks.updatedAt}) - julianday(${tasks.createdAt}))`
      })
      .from(tasks)
      .where(
        dateFilter 
          ? and(eq(tasks.status, 'done'), dateFilter)
          : eq(tasks.status, 'done')
      )
      .orderBy(sql`julianday(${tasks.updatedAt}) - julianday(${tasks.createdAt})`)

    // Group completion times into buckets for histogram
    const timeBuckets = [
      { range: '0-1 days', min: 0, max: 1, count: 0 },
      { range: '1-3 days', min: 1, max: 3, count: 0 },
      { range: '3-7 days', min: 3, max: 7, count: 0 },
      { range: '1-2 weeks', min: 7, max: 14, count: 0 },
      { range: '2-4 weeks', min: 14, max: 28, count: 0 },
      { range: '1+ months', min: 28, max: Infinity, count: 0 }
    ]

    completionTimeData.forEach(task => {
      const days = Number(task.daysToComplete)
      for (const bucket of timeBuckets) {
        if (days >= bucket.min && days < bucket.max) {
          bucket.count++
          break
        }
      }
    })

    // Tasks stuck in each status (aging analysis)
    const now = new Date()
    const agingTasks = await db
      .select({
        status: tasks.status,
        taskId: tasks.id,
        title: tasks.title,
        daysInStatus: sql<number>`ROUND(julianday('now') - julianday(${tasks.updatedAt}))`
      })
      .from(tasks)
      .where(
        dateFilter 
          ? and(sql`${tasks.status} != 'done'`, dateFilter)
          : sql`${tasks.status} != 'done'`
      )
      .having(sql`julianday('now') - julianday(${tasks.updatedAt}) > 7`) // Tasks stuck for more than 7 days
      .orderBy(sql`julianday('now') - julianday(${tasks.updatedAt}) DESC`)

    const stuckTasks = agingTasks.map(task => ({
      taskId: task.taskId,
      title: task.title,
      status: task.status,
      daysStuck: Number(task.daysInStatus)
    }))

    return NextResponse.json({
      success: true,
      data: {
        completionByPriority,
        completionByProject: projectCompletionData,
        statusDistribution: statusData,
        completionTimeHistogram: timeBuckets,
        completionTimes: completionTimeData.map(t => ({
          taskId: t.taskId,
          title: t.title,
          priority: t.priority,
          daysToComplete: Number(t.daysToComplete)
        })),
        stuckTasks: stuckTasks.slice(0, 10) // Top 10 most stuck tasks
      },
    })

  } catch (error) {
    console.error('Analytics completion error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}