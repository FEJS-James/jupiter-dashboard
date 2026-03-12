import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, agents, activity } from '@/lib/schema'
import { count, sql, eq, gte, and, desc } from 'drizzle-orm'

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

    // Tasks assigned per agent (current assignment)
    const tasksPerAgent = await db
      .select({
        agentName: agents.name,
        agentRole: agents.role,
        agentColor: agents.color,
        agentStatus: agents.status,
        activeTasks: count(tasks.id),
        completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in-progress' THEN 1 ELSE 0 END)`
      })
      .from(agents)
      .leftJoin(tasks, eq(agents.name, tasks.assignedAgent))
      .where(dateFilter ? sql`(${tasks.id} IS NULL OR (${dateFilter}))` : undefined)
      .groupBy(agents.id, agents.name, agents.role, agents.color, agents.status)
      .orderBy(desc(count(tasks.id)))

    const workloadData = tasksPerAgent.map(agent => ({
      agentName: agent.agentName,
      role: agent.agentRole,
      color: agent.agentColor,
      status: agent.agentStatus,
      totalTasks: agent.activeTasks,
      completedTasks: Number(agent.completed),
      inProgressTasks: Number(agent.inProgress),
      completionRate: agent.activeTasks > 0 ? Math.round((Number(agent.completed) / agent.activeTasks) * 10000) / 100 : 0
    }))

    // Agent productivity metrics (tasks completed in time period)
    const productivityData = await db
      .select({
        agentName: agents.name,
        agentRole: agents.role,
        completedCount: count(activity.id),
        avgCompletionTime: sql<number>`AVG(julianday(${activity.timestamp}) - julianday(${tasks.createdAt}))`
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .where(and(
        eq(activity.action, 'status_changed'),
        sql`JSON_EXTRACT(${activity.details}, '$.to') = 'done'`,
        dateFilter ? sql`${activity.timestamp} >= ${new Date(startDate!).toISOString()}` : sql`1=1`
      ))
      .groupBy(agents.id, agents.name, agents.role)
      .orderBy(desc(count(activity.id)))

    // Agent workload balance analysis
    const totalTasksAssigned = workloadData.reduce((sum, agent) => sum + agent.totalTasks, 0)
    const avgTasksPerAgent = workloadData.length > 0 ? totalTasksAssigned / workloadData.length : 0
    
    const workloadBalance = workloadData.map(agent => ({
      ...agent,
      workloadRatio: avgTasksPerAgent > 0 ? agent.totalTasks / avgTasksPerAgent : 0,
      isOverloaded: agent.totalTasks > avgTasksPerAgent * 1.5,
      isUnderloaded: agent.totalTasks < avgTasksPerAgent * 0.5
    }))

    // Agent availability and capacity
    const agentCapacity = await db
      .select({
        agentName: agents.name,
        role: agents.role,
        status: agents.status,
        currentTaskId: agents.currentTaskId,
        totalAssigned: count(tasks.id),
        currentTask: sql<string>`CASE WHEN ${agents.currentTaskId} IS NOT NULL THEN ${tasks.title} ELSE NULL END`
      })
      .from(agents)
      .leftJoin(tasks, eq(agents.name, tasks.assignedAgent))
      .groupBy(agents.id, agents.name, agents.role, agents.status, agents.currentTaskId)

    const capacityData = agentCapacity.map(agent => ({
      agentName: agent.agentName,
      role: agent.role,
      status: agent.status,
      currentTaskTitle: agent.currentTask,
      totalAssigned: agent.totalAssigned,
      isAvailable: agent.status === 'available' && !agent.currentTaskId,
      capacity: agent.status === 'busy' ? 'Full' : agent.status === 'available' ? 'Available' : 'Offline'
    }))

    // Peak activity analysis (when agents are most active)
    const activityByHour = await db
      .select({
        hour: sql<number>`CAST(strftime('%H', ${activity.timestamp}) AS INTEGER)`,
        activityCount: count(activity.id),
        agentCount: sql<number>`COUNT(DISTINCT ${activity.agentId})`
      })
      .from(activity)
      .where(dateFilter ? gte(activity.timestamp, new Date(startDate!)) : sql`1=1`)
      .groupBy(sql`strftime('%H', ${activity.timestamp})`)
      .orderBy(sql`CAST(strftime('%H', ${activity.timestamp}) AS INTEGER)`)

    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      const data = activityByHour.find(a => a.hour === hour)
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        activityCount: data?.activityCount || 0,
        activeAgents: data?.agentCount || 0
      }
    })

    // Agent collaboration metrics (shared tasks/projects)
    const collaborationData = await db
      .select({
        projectId: tasks.projectId,
        agentName: agents.name,
        taskCount: count(tasks.id)
      })
      .from(tasks)
      .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
      .where(dateFilter)
      .groupBy(tasks.projectId, agents.name)
      .having(sql`COUNT(${tasks.id}) > 0`)

    // Calculate task switching frequency (how often agents change tasks)
    const taskSwitches = await db
      .select({
        agentId: activity.agentId,
        agentName: agents.name,
        switches: count(activity.id)
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .where(and(
        eq(activity.action, 'assigned'),
        dateFilter ? sql`${activity.timestamp} >= ${new Date(startDate!).toISOString()}` : sql`1=1`
      ))
      .groupBy(activity.agentId, agents.name)
      .orderBy(desc(count(activity.id)))

    return NextResponse.json({
      success: true,
      data: {
        workloadDistribution: workloadData,
        productivityMetrics: productivityData.map(p => ({
          agentName: p.agentName,
          role: p.agentRole,
          tasksCompleted: p.completedCount,
          avgCompletionTime: Math.round((Number(p.avgCompletionTime) || 0) * 10) / 10
        })),
        workloadBalance: {
          agents: workloadBalance,
          avgTasksPerAgent: Math.round(avgTasksPerAgent * 100) / 100,
          totalTasks: totalTasksAssigned,
          overloadedAgents: workloadBalance.filter(a => a.isOverloaded).length,
          underloadedAgents: workloadBalance.filter(a => a.isUnderloaded).length
        },
        agentCapacity: capacityData,
        peakActivity: {
          hourlyData: hourlyActivity,
          peakHour: hourlyActivity.reduce((max, hour) => 
            hour.activityCount > max.activityCount ? hour : max
          )
        },
        taskSwitching: taskSwitches.map(ts => ({
          agentName: ts.agentName || 'Unknown',
          switches: ts.switches
        }))
      },
    })

  } catch (error) {
    console.error('Analytics agents error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}