import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, comments, activity, agents } from '@/lib/schema'
import { count, sql, eq, gte, and, desc } from 'drizzle-orm'
import { format, subDays, startOfWeek, startOfDay } from 'date-fns'
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
    
    // Build separate date filters for different data sources
    let taskCreationFilter = undefined
    let commentDateFilter = undefined
    let activityDateFilter = undefined
    
    if (startDate || endDate) {
      if (startDate) {
        taskCreationFilter = sql`${tasks.createdAt} >= ${new Date(startDate).toISOString()}`
        commentDateFilter = sql`${comments.timestamp} >= ${new Date(startDate).toISOString()}`
        activityDateFilter = sql`${activity.timestamp} >= ${new Date(startDate).toISOString()}`
      }
      if (endDate) {
        const endTaskFilter = sql`${tasks.createdAt} <= ${new Date(endDate).toISOString()}`
        const endCommentFilter = sql`${comments.timestamp} <= ${new Date(endDate).toISOString()}`
        const endActivityFilter = sql`${activity.timestamp} <= ${new Date(endDate).toISOString()}`
        
        taskCreationFilter = taskCreationFilter 
          ? and(taskCreationFilter, endTaskFilter) 
          : endTaskFilter
        commentDateFilter = commentDateFilter 
          ? and(commentDateFilter, endCommentFilter) 
          : endCommentFilter
        activityDateFilter = activityDateFilter 
          ? and(activityDateFilter, endActivityFilter) 
          : endActivityFilter
      }
    }

    // Task priority distribution (use task creation filter)
    const priorityDistribution = await db
      .select({
        priority: tasks.priority,
        count: count(tasks.id)
      })
      .from(tasks)
      .where(taskCreationFilter)
      .groupBy(tasks.priority)
      .orderBy(tasks.priority)

    const priorityData = priorityDistribution.map(item => ({
      priority: item.priority.charAt(0).toUpperCase() + item.priority.slice(1),
      count: item.count,
      percentage: 0 // Will calculate below
    }))

    const totalPriorityTasks = priorityData.reduce((sum, item) => sum + item.count, 0)
    priorityData.forEach(item => {
      item.percentage = totalPriorityTasks > 0 ? Math.round((item.count / totalPriorityTasks) * 10000) / 100 : 0
    })

    // Comment activity and engagement metrics
    const commentActivity = await db
      .select({
        agentId: comments.agentId,
        agentName: agents.name,
        agentRole: agents.role,
        commentCount: count(comments.id),
        avgCommentLength: sql<number>`AVG(LENGTH(${comments.content}))`,
        lastCommentDate: sql<string>`MAX(${comments.timestamp})`
      })
      .from(comments)
      .leftJoin(agents, eq(comments.agentId, agents.id))
      .where(commentDateFilter)
      .groupBy(comments.agentId, agents.name, agents.role)
      .orderBy(desc(count(comments.id)))

    const commentEngagement = commentActivity.map(activity => ({
      agentName: activity.agentName || 'Unknown',
      role: activity.agentRole || 'Unknown',
      commentCount: activity.commentCount,
      avgCommentLength: Math.round(Number(activity.avgCommentLength) || 0),
      lastCommentDate: activity.lastCommentDate,
      engagementLevel: activity.commentCount > 10 ? 'High' : activity.commentCount > 5 ? 'Medium' : 'Low'
    }))

    // Peak activity hours/days heatmap
    const last7Days = subDays(new Date(), 7)
    const activityHeatmap = await db
      .select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${activity.timestamp}) AS INTEGER)`,
        hour: sql<number>`CAST(strftime('%H', ${activity.timestamp}) AS INTEGER)`,
        activityCount: count(activity.id)
      })
      .from(activity)
      .where(sql`${activity.timestamp} >= ${last7Days.toISOString()}`)
      .groupBy(sql`strftime('%w', ${activity.timestamp})`, sql`strftime('%H', ${activity.timestamp})`)
      .orderBy(sql`strftime('%w', ${activity.timestamp})`, sql`strftime('%H', ${activity.timestamp})`)

    // Create full heatmap grid (7 days × 24 hours)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const heatmapGrid = days.map((dayName, dayIndex) => ({
      day: dayName,
      dayIndex,
      hours: Array.from({ length: 24 }, (_, hour) => {
        const data = activityHeatmap.find(h => h.dayOfWeek === dayIndex && h.hour === hour)
        return {
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          activityCount: data?.activityCount || 0,
          intensity: (data?.activityCount || 0) > 10 ? 'high' : (data?.activityCount || 0) > 5 ? 'medium' : (data?.activityCount || 0) > 0 ? 'low' : 'none'
        }
      })
    }))

    // Find peak activity time
    const peakActivity = activityHeatmap.reduce((max, current) => 
      current.activityCount > (max?.activityCount || 0) ? current : max
    , activityHeatmap[0] || { dayOfWeek: 0, hour: 0, activityCount: 0 })

    const peakTime = {
      day: days[peakActivity?.dayOfWeek] || 'N/A',
      hour: peakActivity ? `${peakActivity.hour.toString().padStart(2, '0')}:00` : 'N/A',
      activityCount: peakActivity?.activityCount || 0
    }

    // Task aging analysis (tasks stuck too long)
    const agingThresholds = {
      backlog: 7,      // 7 days
      'in-progress': 3, // 3 days
      'code-review': 2, // 2 days
      'testing': 2,     // 2 days
      'deploying': 1,   // 1 day
      'blocked': 1      // 1 day
    }

    const agingTasks = await db
      .select({
        taskId: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        assignedAgent: tasks.assignedAgent,
        projectId: tasks.projectId,
        daysInStatus: sql<number>`ROUND(julianday('now') - julianday(${tasks.updatedAt}))`,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .where(sql`${tasks.status} != 'done'`)
      .orderBy(sql`julianday('now') - julianday(${tasks.updatedAt}) DESC`)

    const stuckTasks = agingTasks
      .map(task => {
        const threshold = agingThresholds[task.status as keyof typeof agingThresholds] || 7
        const daysInStatus = Number(task.daysInStatus)
        return {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignedAgent: task.assignedAgent,
          daysInStatus,
          threshold,
          isStuck: daysInStatus > threshold,
          urgency: daysInStatus > threshold * 2 ? 'high' : daysInStatus > threshold ? 'medium' : 'low'
        }
      })
      .filter(task => task.isStuck)
      .slice(0, 20) // Top 20 stuck tasks

    // Comment sentiment analysis (basic - based on length and keywords)
    const commentSentiment = await db
      .select({
        taskId: comments.taskId,
        commentId: comments.id,
        content: comments.content,
        agentName: agents.name,
        timestamp: comments.timestamp
      })
      .from(comments)
      .leftJoin(agents, eq(comments.agentId, agents.id))
      .where(commentDateFilter)
      .orderBy(desc(comments.timestamp))
      .limit(50) // Latest 50 comments

    // Simple sentiment scoring based on keywords and patterns
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'done', 'completed', 'fixed', 'working', 'success']
    const negativeWords = ['issue', 'problem', 'error', 'bug', 'broken', 'failed', 'stuck', 'blocked', 'difficult']
    
    const sentimentData = commentSentiment.map(comment => {
      const content = comment.content.toLowerCase()
      const positiveCount = positiveWords.filter(word => content.includes(word)).length
      const negativeCount = negativeWords.filter(word => content.includes(word)).length
      
      let sentiment = 'neutral'
      if (positiveCount > negativeCount) sentiment = 'positive'
      else if (negativeCount > positiveCount) sentiment = 'negative'
      
      return {
        taskId: comment.taskId,
        commentId: comment.commentId,
        agentName: comment.agentName || 'Unknown',
        sentiment,
        confidence: Math.abs(positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1),
        timestamp: comment.timestamp,
        preview: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
      }
    })

    // Task creation vs completion trend (last 30 days)
    const last30Days = subDays(new Date(), 30)
    const trendData = await db
      .select({
        date: sql<string>`DATE(${activity.timestamp})`,
        creations: sql<number>`SUM(CASE WHEN ${activity.action} = 'created' THEN 1 ELSE 0 END)`,
        completions: sql<number>`SUM(CASE WHEN ${activity.action} = 'status_changed' AND JSON_EXTRACT(${activity.details}, '$.to') = 'done' THEN 1 ELSE 0 END)`
      })
      .from(activity)
      .where(sql`${activity.timestamp} >= ${last30Days.toISOString()}`)
      .groupBy(sql`DATE(${activity.timestamp})`)
      .orderBy(sql`DATE(${activity.timestamp})`)

    // Fill in missing dates with zeros
    const dateRange: string[] = []
    for (let d = new Date(last30Days); d <= new Date(); d.setDate(d.getDate() + 1)) {
      dateRange.push(format(d, 'yyyy-MM-dd'))
    }

    const completeTrend = dateRange.map(date => {
      const data = trendData.find(t => t.date === date)
      return {
        date,
        creations: Number(data?.creations || 0),
        completions: Number(data?.completions || 0),
        net: (Number(data?.creations || 0)) - (Number(data?.completions || 0))
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        priorityDistribution: priorityData,
        commentEngagement: commentEngagement,
        activityHeatmap: {
          grid: heatmapGrid,
          peakTime
        },
        taskAging: {
          stuckTasks,
          summary: {
            totalStuck: stuckTasks.length,
            highUrgency: stuckTasks.filter(t => t.urgency === 'high').length,
            mediumUrgency: stuckTasks.filter(t => t.urgency === 'medium').length,
            avgDaysStuck: stuckTasks.length > 0 ? Math.round(stuckTasks.reduce((sum, t) => sum + t.daysInStatus, 0) / stuckTasks.length) : 0
          }
        },
        commentSentiment: {
          comments: sentimentData,
          summary: {
            positive: sentimentData.filter(c => c.sentiment === 'positive').length,
            negative: sentimentData.filter(c => c.sentiment === 'negative').length,
            neutral: sentimentData.filter(c => c.sentiment === 'neutral').length,
            overallSentiment: sentimentData.length > 0 ? (
              sentimentData.filter(c => c.sentiment === 'positive').length > 
              sentimentData.filter(c => c.sentiment === 'negative').length ? 'positive' : 
              sentimentData.filter(c => c.sentiment === 'negative').length > 
              sentimentData.filter(c => c.sentiment === 'positive').length ? 'negative' : 'neutral'
            ) : 'neutral'
          }
        },
        taskTrend: completeTrend
      },
    })

  } catch (error) {
    console.error('Analytics additional error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}