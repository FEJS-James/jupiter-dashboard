import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activity, agents, projects } from '@/lib/schema'
import { desc, eq, gte, count, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get date boundaries
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total activities count
    const totalActivitiesResult = await db
      .select({ count: count() })
      .from(activity)

    const totalActivities = totalActivitiesResult[0]?.count || 0

    // Get activities in last 24 hours
    const last24HoursResult = await db
      .select({ count: count() })
      .from(activity)
      .where(gte(activity.timestamp, yesterday))

    const activitiesLast24Hours = last24HoursResult[0]?.count || 0

    // Get most active project (last 7 days)
    const mostActiveProjectResult = await db
      .select({
        projectId: activity.projectId,
        projectName: projects.name,
        count: count()
      })
      .from(activity)
      .leftJoin(projects, eq(activity.projectId, projects.id))
      .where(gte(activity.timestamp, weekAgo))
      .groupBy(activity.projectId, projects.name)
      .orderBy(desc(count()))
      .limit(1)

    const mostActiveProject = mostActiveProjectResult[0]?.projectName || 'None'

    // Get most active agent (last 7 days)
    const mostActiveAgentResult = await db
      .select({
        agentId: activity.agentId,
        agentName: agents.name,
        count: count()
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .where(gte(activity.timestamp, weekAgo))
      .groupBy(activity.agentId, agents.name)
      .orderBy(desc(count()))
      .limit(1)

    const mostActiveAgent = mostActiveAgentResult[0]?.agentName || 'None'

    // Get top activity types (last 7 days)
    const topActivityTypesResult = await db
      .select({
        action: activity.action,
        count: count()
      })
      .from(activity)
      .where(gte(activity.timestamp, weekAgo))
      .groupBy(activity.action)
      .orderBy(desc(count()))
      .limit(5)

    // Calculate percentages for activity types
    const totalWeekActivities = topActivityTypesResult.reduce((sum, item) => sum + item.count, 0)
    const topActivityTypes = topActivityTypesResult.map(item => ({
      type: item.action,
      count: item.count,
      percentage: totalWeekActivities > 0 ? (item.count / totalWeekActivities) * 100 : 0
    }))

    const stats = {
      totalActivities,
      activitiesLast24Hours,
      mostActiveProject,
      mostActiveAgent,
      topActivityTypes,
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })

  } catch (error) {
    console.error('Activity stats error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}