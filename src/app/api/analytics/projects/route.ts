import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, projects, activity } from '@/lib/schema'
import { count, sql, eq, gte, and, desc } from 'drizzle-orm'
import { format, subDays } from 'date-fns'
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
    
    // Build separate date filters for creation and completion/activity metrics
    let creationFilter = undefined
    let activityFilter = undefined
    
    if (startDate || endDate) {
      if (startDate) {
        creationFilter = sql`${tasks.createdAt} >= ${new Date(startDate).toISOString()}`
        activityFilter = sql`${activity.timestamp} >= ${new Date(startDate).toISOString()}`
      }
      if (endDate) {
        const endCreationFilter = sql`${tasks.createdAt} <= ${new Date(endDate).toISOString()}`
        const endActivityFilter = sql`${activity.timestamp} <= ${new Date(endDate).toISOString()}`
        
        creationFilter = creationFilter 
          ? and(creationFilter, endCreationFilter) 
          : endCreationFilter
        activityFilter = activityFilter 
          ? and(activityFilter, endActivityFilter) 
          : endActivityFilter
      }
    }

    // Project progress tracking (use creation filter for task counts)
    const projectProgress = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        status: projects.status,
        totalTasks: count(tasks.id),
        completedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END)`,
        inProgressTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in-progress' THEN 1 ELSE 0 END)`,
        blockedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'blocked' THEN 1 ELSE 0 END)`,
        highPriorityTasks: sql<number>`SUM(CASE WHEN ${tasks.priority} = 'high' OR ${tasks.priority} = 'urgent' THEN 1 ELSE 0 END)`,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .where(creationFilter ? sql`(${tasks.id} IS NULL OR (${creationFilter}))` : undefined)
      .groupBy(projects.id, projects.name, projects.status, projects.createdAt, projects.updatedAt)
      .orderBy(projects.name)

    const progressData = projectProgress.map(project => ({
      projectId: project.projectId,
      projectName: project.projectName,
      status: project.status,
      totalTasks: project.totalTasks,
      completedTasks: Number(project.completedTasks),
      inProgressTasks: Number(project.inProgressTasks),
      blockedTasks: Number(project.blockedTasks),
      highPriorityTasks: Number(project.highPriorityTasks),
      completionRate: project.totalTasks > 0 ? Math.round((Number(project.completedTasks) / project.totalTasks) * 10000) / 100 : 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }))

    // Project velocity comparison (tasks completed over time - use activity filter or default to last 30 days)
    const velocityStartDate = activityFilter ? new Date(startDate!) : subDays(new Date(), 30)
    const projectVelocity = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        completedInPeriod: count(activity.id),
        avgTasksPerWeek: sql<number>`CAST(COUNT(${activity.id}) * 7.0 / 30.0 AS REAL)`
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .leftJoin(activity, and(
        eq(activity.taskId, tasks.id),
        eq(activity.action, 'status_changed'),
        sql`JSON_EXTRACT(${activity.details}, '$.to') = 'done'`,
        activityFilter || sql`${activity.timestamp} >= ${velocityStartDate.toISOString()}`
      ))
      .groupBy(projects.id, projects.name)
      .orderBy(desc(count(activity.id)))

    const velocityData = projectVelocity.map(project => ({
      projectId: project.projectId,
      projectName: project.projectName,
      tasksCompletedLast30Days: project.completedInPeriod,
      avgTasksPerWeek: Math.round((Number(project.avgTasksPerWeek) || 0) * 100) / 100,
      velocity: project.completedInPeriod > 0 ? 'High' : 'Low'
    }))

    // Tasks per project breakdown with priorities (use creation filter)
    const taskBreakdown = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        priority: tasks.priority,
        status: tasks.status,
        count: count(tasks.id)
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .where(creationFilter)
      .groupBy(projects.id, projects.name, tasks.priority, tasks.status)
      .orderBy(projects.name, tasks.priority)

    // Group task breakdown data by project
    const projectTaskBreakdown = new Map<number, any>()
    taskBreakdown.forEach(item => {
      if (!projectTaskBreakdown.has(item.projectId)) {
        projectTaskBreakdown.set(item.projectId, {
          projectId: item.projectId,
          projectName: item.projectName,
          byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
          byStatus: { backlog: 0, 'in-progress': 0, 'code-review': 0, testing: 0, deploying: 0, done: 0, blocked: 0 }
        })
      }
      
      const project = projectTaskBreakdown.get(item.projectId)!
      if (item.priority) {
        project.byPriority[item.priority] = item.count
      }
      if (item.status) {
        project.byStatus[item.status] = item.count
      }
    })

    const taskBreakdownData = Array.from(projectTaskBreakdown.values())

    // Project timeline and milestones (based on task due dates - use creation filter)
    const projectTimelines = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        projectStatus: projects.status,
        earliestTask: sql<string>`MIN(${tasks.createdAt})`,
        latestTask: sql<string>`MAX(${tasks.updatedAt})`,
        nearestDueDate: sql<string>`MIN(${tasks.dueDate})`,
        overdueTasks: sql<number>`SUM(CASE WHEN ${tasks.dueDate} < datetime('now') AND ${tasks.status} != 'done' THEN 1 ELSE 0 END)`,
        totalWithDueDates: sql<number>`SUM(CASE WHEN ${tasks.dueDate} IS NOT NULL THEN 1 ELSE 0 END)`
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .where(creationFilter)
      .groupBy(projects.id, projects.name, projects.status)
      .orderBy(projects.name)

    const timelineData = projectTimelines.map(timeline => {
      const startDate = timeline.earliestTask ? new Date(timeline.earliestTask) : null
      const endDate = timeline.latestTask ? new Date(timeline.latestTask) : null
      const durationDays = startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        projectId: timeline.projectId,
        projectName: timeline.projectName,
        status: timeline.projectStatus,
        startDate: timeline.earliestTask,
        endDate: timeline.latestTask,
        durationDays,
        nextDueDate: timeline.nearestDueDate,
        overdueTasks: Number(timeline.overdueTasks),
        tasksWithDueDates: Number(timeline.totalWithDueDates),
        isOverdue: Number(timeline.overdueTasks) > 0
      }
    })

    // Cross-project resource allocation (agents working on multiple projects - use creation filter)
    const resourceAllocation = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        agentName: tasks.assignedAgent,
        taskCount: count(tasks.id)
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .where(and(
        sql`${tasks.assignedAgent} IS NOT NULL`,
        creationFilter || sql`${tasks.status} != 'done'`
      ))
      .groupBy(projects.id, projects.name, tasks.assignedAgent)
      .orderBy(projects.name, desc(count(tasks.id)))

    // Process resource allocation data
    const resourceData = new Map<string, any>()
    resourceAllocation.forEach(allocation => {
      const agentName = allocation.agentName || 'Unassigned'
      if (!resourceData.has(agentName)) {
        resourceData.set(agentName, {
          agentName,
          projects: [],
          totalTasks: 0
        })
      }
      
      const agent = resourceData.get(agentName)!
      agent.projects.push({
        projectId: allocation.projectId,
        projectName: allocation.projectName,
        taskCount: allocation.taskCount
      })
      agent.totalTasks += allocation.taskCount
    })

    const crossProjectAllocation = Array.from(resourceData.values()).map(agent => ({
      ...agent,
      projectCount: agent.projects.length,
      isMultiProject: agent.projects.length > 1
    }))

    // Project health score (based on completion rate, velocity, and overdue tasks)
    const projectHealth = progressData.map(project => {
      const timeline = timelineData.find(t => t.projectId === project.projectId)
      const velocity = velocityData.find(v => v.projectId === project.projectId)
      
      let healthScore = 100
      
      // Deduct for low completion rate
      if (project.completionRate < 50) healthScore -= 30
      else if (project.completionRate < 80) healthScore -= 15
      
      // Deduct for blocked tasks
      if (project.blockedTasks > 0) healthScore -= (project.blockedTasks * 10)
      
      // Deduct for overdue tasks
      if (timeline?.overdueTasks && timeline.overdueTasks > 0) healthScore -= (timeline.overdueTasks * 15)
      
      // Deduct for low velocity
      if (velocity && velocity.tasksCompletedLast30Days === 0) healthScore -= 20
      
      // Ensure score doesn't go below 0
      healthScore = Math.max(0, healthScore)
      
      return {
        projectId: project.projectId,
        projectName: project.projectName,
        healthScore,
        healthStatus: healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Warning' : 'Critical'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        projectProgress: progressData,
        projectVelocity: velocityData,
        taskBreakdown: taskBreakdownData,
        projectTimelines: timelineData,
        resourceAllocation: crossProjectAllocation,
        projectHealth: projectHealth.sort((a, b) => b.healthScore - a.healthScore)
      },
    })

  } catch (error) {
    console.error('Analytics projects error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}