import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, activity } from '@/lib/schema'
import { count, sql, eq, gte, and, desc } from 'drizzle-orm'
import { format, subDays, startOfDay } from 'date-fns'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days') || '30'
    const period = searchParams.get('period') || 'day' // day, week, month
    
    // Input validation
    const days = parseInt(daysParam)
    if (isNaN(days) || days <= 0 || days > 365) {
      return NextResponse.json({ error: 'Invalid days parameter (must be 1-365)' }, { status: 400 })
    }
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period parameter (must be day, week, or month)' }, { status: 400 })
    }
    
    const endDate = startOfDay(new Date())
    const startDate = startOfDay(subDays(endDate, days))

    // Task creation velocity
    const taskCreationData = await db
      .select({
        date: sql<string>`DATE(${tasks.createdAt})`,
        count: count()
      })
      .from(tasks)
      .where(and(
        sql`${tasks.createdAt} >= ${startDate.toISOString()}`,
        sql`${tasks.createdAt} <= ${endDate.toISOString()}`
      ))
      .groupBy(sql`DATE(${tasks.createdAt})`)
      .orderBy(sql`DATE(${tasks.createdAt})`)

    // Task completion velocity  
    const taskCompletionData = await db
      .select({
        date: sql<string>`DATE(${activity.timestamp})`,
        count: count()
      })
      .from(activity)
      .where(and(
        eq(activity.action, 'status_changed'),
        sql`JSON_EXTRACT(${activity.details}, '$.to') = 'done'`,
        sql`${activity.timestamp} >= ${startDate.toISOString()}`,
        sql`${activity.timestamp} <= ${endDate.toISOString()}`
      ))
      .groupBy(sql`DATE(${activity.timestamp})`)
      .orderBy(sql`DATE(${activity.timestamp})`)

    // Create a complete date range
    const dateRange: string[] = []
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(format(d, 'yyyy-MM-dd'))
    }

    // Merge creation and completion data with zero-filling
    const velocityData = dateRange.map(date => {
      const creation = taskCreationData.find(d => d.date === date)
      const completion = taskCompletionData.find(d => d.date === date)
      
      return {
        date,
        created: creation?.count || 0,
        completed: completion?.count || 0,
        net: (creation?.count || 0) - (completion?.count || 0)
      }
    })

    // Calculate moving averages (7-day)
    const movingAverageWindow = 7
    const velocityWithMA = velocityData.map((item, index) => {
      if (index < movingAverageWindow - 1) {
        return { ...item, createdMA: item.created, completedMA: item.completed }
      }
      
      const window = velocityData.slice(index - movingAverageWindow + 1, index + 1)
      const createdMA = window.reduce((sum, d) => sum + d.created, 0) / movingAverageWindow
      const completedMA = window.reduce((sum, d) => sum + d.completed, 0) / movingAverageWindow
      
      return {
        ...item,
        createdMA: Math.round(createdMA * 100) / 100,
        completedMA: Math.round(completedMA * 100) / 100
      }
    })

    // Calculate velocity metrics
    const totalCreated = velocityData.reduce((sum, d) => sum + d.created, 0)
    const totalCompleted = velocityData.reduce((sum, d) => sum + d.completed, 0)
    const avgDailyCreation = totalCreated / days
    const avgDailyCompletion = totalCompleted / days
    const velocityTrend = totalCompleted - totalCreated // Negative = backlog growing

    // Group by period if requested
    let chartData = velocityWithMA
    if (period === 'week') {
      // Group by weeks
      const weekData = new Map<string, any>()
      velocityWithMA.forEach(item => {
        const date = new Date(item.date)
        const weekStart = startOfDay(new Date(date.setDate(date.getDate() - date.getDay())))
        const weekKey = format(weekStart, 'yyyy-MM-dd')
        
        if (!weekData.has(weekKey)) {
          weekData.set(weekKey, {
            date: weekKey,
            created: 0,
            completed: 0,
            net: 0
          })
        }
        
        const week = weekData.get(weekKey)!
        week.created += item.created
        week.completed += item.completed  
        week.net += item.net
      })
      
      chartData = Array.from(weekData.values()).sort((a, b) => a.date.localeCompare(b.date))
    }

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        metrics: {
          totalCreated,
          totalCompleted,
          avgDailyCreation: Math.round(avgDailyCreation * 100) / 100,
          avgDailyCompletion: Math.round(avgDailyCompletion * 100) / 100,
          velocityTrend,
          period: `${days} days`
        }
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    })

  } catch (error) {
    console.error('Analytics velocity error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}