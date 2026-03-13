import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, agents, projects, activity } from '@/lib/schema'
import { desc, eq, and, gte, lte, count, sql, ne, avg, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { format as formatDate, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'
import { requireAuth } from '@/lib/auth'

const reportGenerationSchema = z.object({
  reportType: z.enum(['overview', 'project-health', 'agent-performance', 'velocity', 'custom']).default('overview'),
  format: z.enum(['json', 'csv']).default('json'),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    preset: z.enum(['week', 'month', 'quarter', 'year', 'last-30-days', 'last-7-days']).optional(),
  }).optional(),
  filters: z.object({
    projectIds: z.array(z.number()).optional(),
    agentIds: z.array(z.number()).optional(),
    statuses: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
  }).optional(),
  sections: z.array(z.enum([
    'summary', 'task-distribution', 'completion-trends', 'agent-workload',
    'project-status', 'velocity-metrics', 'timeline-analysis', 'risk-indicators'
  ])).optional().default(['summary', 'task-distribution', 'completion-trends']),
  includeCharts: z.boolean().default(false),
  templateId: z.string().optional(), // For saved report templates
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const body = await request.json()
    
    // Parse and validate request body
    const parsed = reportGenerationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { reportType, format, dateRange, filters, sections, includeCharts } = parsed.data

    // Calculate date range
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (dateRange?.preset) {
      const now = new Date()
      switch (dateRange.preset) {
        case 'week':
          startDate = startOfWeek(now)
          endDate = endOfWeek(now)
          break
        case 'month':
          startDate = startOfMonth(now)
          endDate = endOfMonth(now)
          break
        case 'quarter':
          startDate = startOfMonth(subMonths(now, 2))
          endDate = endOfMonth(now)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
        case 'last-30-days':
          startDate = subDays(now, 30)
          endDate = now
          break
        case 'last-7-days':
          startDate = subDays(now, 7)
          endDate = now
          break
      }
    } else if (dateRange?.start || dateRange?.end) {
      startDate = dateRange.start ? new Date(dateRange.start) : undefined
      endDate = dateRange.end ? new Date(dateRange.end) : undefined
    }

    // Build base filters
    const buildTaskFilters = () => {
      const conditions = []
      if (startDate) conditions.push(gte(tasks.createdAt, startDate))
      if (endDate) conditions.push(lte(tasks.createdAt, endDate))
      if (filters?.projectIds?.length) conditions.push(sql`${tasks.projectId} IN ${filters.projectIds}`)
      if (filters?.statuses?.length) conditions.push(sql`${tasks.status} IN ${filters.statuses}`)
      if (filters?.priorities?.length) conditions.push(sql`${tasks.priority} IN ${filters.priorities}`)
      return conditions
    }

    const buildCompletionFilters = () => {
      const conditions = [eq(tasks.status, 'done')]
      if (startDate) conditions.push(gte(tasks.updatedAt, startDate))
      if (endDate) conditions.push(lte(tasks.updatedAt, endDate))
      if (filters?.projectIds?.length) conditions.push(sql`${tasks.projectId} IN ${filters.projectIds}`)
      if (filters?.priorities?.length) conditions.push(sql`${tasks.priority} IN ${filters.priorities}`)
      return conditions
    }

    // Initialize report data structure
    const reportData: any = {
      metadata: {
        reportType,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate?.toISOString(),
          end: endDate?.toISOString(),
          preset: dateRange?.preset
        },
        filters: filters || {},
        sections,
      },
      data: {}
    }

    // Generate each requested section
    if (sections.includes('summary')) {
      const taskFilters = buildTaskFilters()
      const completionFilters = buildCompletionFilters()

      // Basic counts
      const [totalTasksResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(taskFilters.length > 0 ? and(...taskFilters) : undefined)

      const [completedTasksResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(completionFilters.length > 0 ? and(...completionFilters) : undefined)

      const [inProgressResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(
          eq(tasks.status, 'in-progress'),
          ...(taskFilters.length > 0 ? taskFilters : [])
        ))

      const [blockedResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(
          eq(tasks.status, 'blocked'),
          ...(taskFilters.length > 0 ? taskFilters : [])
        ))

      // Average completion time
      const [avgCompletionResult] = await db
        .select({
          avgDays: sql<number>`AVG((julianday(${tasks.updatedAt}) - julianday(${tasks.createdAt})))`
        })
        .from(tasks)
        .where(completionFilters.length > 0 ? and(...completionFilters) : undefined)

      const totalTasks = totalTasksResult?.count || 0
      const completedTasks = completedTasksResult?.count || 0
      const inProgressTasks = inProgressResult?.count || 0
      const blockedTasks = blockedResult?.count || 0

      reportData.data.summary = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 10000) / 100 : 0,
        avgCompletionTime: Math.round((avgCompletionResult?.avgDays || 0) * 10) / 10
      }
    }

    if (sections.includes('task-distribution')) {
      const taskFilters = buildTaskFilters()

      // Distribution by status
      const statusDistribution = await db
        .select({
          status: tasks.status,
          count: count()
        })
        .from(tasks)
        .where(taskFilters.length > 0 ? and(...taskFilters) : undefined)
        .groupBy(tasks.status)

      // Distribution by priority
      const priorityDistribution = await db
        .select({
          priority: tasks.priority,
          count: count()
        })
        .from(tasks)
        .where(taskFilters.length > 0 ? and(...taskFilters) : undefined)
        .groupBy(tasks.priority)

      // Distribution by project
      const projectDistribution = await db
        .select({
          projectId: tasks.projectId,
          projectName: projects.name,
          count: count()
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(taskFilters.length > 0 ? and(...taskFilters) : undefined)
        .groupBy(tasks.projectId, projects.name)

      reportData.data.taskDistribution = {
        byStatus: statusDistribution,
        byPriority: priorityDistribution,
        byProject: projectDistribution
      }
    }

    if (sections.includes('completion-trends')) {
      const completionFilters = buildCompletionFilters()

      // Daily completion trends (last 30 days or within date range)
      const trendStartDate = startDate || subDays(new Date(), 30)
      const trendEndDate = endDate || new Date()

      const dailyCompletions = await db
        .select({
          date: sql<string>`date(${tasks.updatedAt})`,
          count: count()
        })
        .from(tasks)
        .where(and(
          eq(tasks.status, 'done'),
          gte(tasks.updatedAt, trendStartDate),
          lte(tasks.updatedAt, trendEndDate),
          ...(filters?.projectIds?.length ? [sql`${tasks.projectId} IN ${filters.projectIds}`] : [])
        ))
        .groupBy(sql`date(${tasks.updatedAt})`)
        .orderBy(sql`date(${tasks.updatedAt})`)

      reportData.data.completionTrends = {
        dailyCompletions,
        dateRange: {
          start: trendStartDate.toISOString(),
          end: trendEndDate.toISOString()
        }
      }
    }

    if (sections.includes('agent-workload')) {
      const taskFilters = buildTaskFilters()

      // Current agent workload
      const agentWorkload = await db
        .select({
          agentName: agents.name,
          agentRole: agents.role,
          totalTasks: count(),
          completedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END)`,
          inProgressTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in-progress' THEN 1 ELSE 0 END)`,
          blockedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'blocked' THEN 1 ELSE 0 END)`,
        })
        .from(tasks)
        .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
        .where(and(
          isNotNull(tasks.assignedAgent),
          ...(taskFilters.length > 0 ? taskFilters : [])
        ))
        .groupBy(agents.name, agents.role)

      reportData.data.agentWorkload = agentWorkload
    }

    if (sections.includes('project-status')) {
      const taskFilters = buildTaskFilters()

      // Project status overview
      const projectStatus = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectStatus: projects.status,
          totalTasks: count(),
          completedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END)`,
          inProgressTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in-progress' THEN 1 ELSE 0 END)`,
          blockedTasks: sql<number>`SUM(CASE WHEN ${tasks.status} = 'blocked' THEN 1 ELSE 0 END)`,
        })
        .from(projects)
        .leftJoin(tasks, eq(projects.id, tasks.projectId))
        .where(taskFilters.length > 0 ? and(...taskFilters) : undefined)
        .groupBy(projects.id, projects.name, projects.status)

      reportData.data.projectStatus = projectStatus
    }

    if (sections.includes('velocity-metrics')) {
      const completionFilters = buildCompletionFilters()

      // Calculate velocity metrics (tasks completed per week)
      const weeklyVelocity = await db
        .select({
          week: sql<string>`strftime('%Y-%W', ${tasks.updatedAt})`,
          tasksCompleted: count(),
        })
        .from(tasks)
        .where(completionFilters.length > 0 ? and(...completionFilters) : undefined)
        .groupBy(sql`strftime('%Y-%W', ${tasks.updatedAt})`)
        .orderBy(sql`strftime('%Y-%W', ${tasks.updatedAt})`)

      reportData.data.velocityMetrics = {
        weeklyVelocity,
      }
    }

    if (sections.includes('risk-indicators')) {
      const taskFilters = buildTaskFilters()

      // Overdue tasks
      const overdueTasks = await db
        .select({
          taskId: tasks.id,
          title: tasks.title,
          dueDate: tasks.dueDate,
          status: tasks.status,
          priority: tasks.priority,
          assignedAgent: tasks.assignedAgent,
          projectName: projects.name,
          daysPastDue: sql<number>`julianday('now') - julianday(${tasks.dueDate})`
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(
          ne(tasks.status, 'done'),
          isNotNull(tasks.dueDate),
          sql`${tasks.dueDate} < datetime('now')`,
          ...(taskFilters.length > 0 ? taskFilters : [])
        ))
        .orderBy(sql`julianday('now') - julianday(${tasks.dueDate}) DESC`)

      // Long-running in-progress tasks
      const staleTasks = await db
        .select({
          taskId: tasks.id,
          title: tasks.title,
          status: tasks.status,
          assignedAgent: tasks.assignedAgent,
          projectName: projects.name,
          daysInProgress: sql<number>`julianday('now') - julianday(${tasks.updatedAt})`
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(
          eq(tasks.status, 'in-progress'),
          sql`julianday('now') - julianday(${tasks.updatedAt}) > 7`, // More than 7 days
          ...(taskFilters.length > 0 ? taskFilters : [])
        ))
        .orderBy(sql`julianday('now') - julianday(${tasks.updatedAt}) DESC`)

      reportData.data.riskIndicators = {
        overdueTasks,
        staleTasks: staleTasks.slice(0, 20) // Limit to top 20
      }
    }

    // Return based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        ...reportData
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${reportType}-report-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.json"`
        }
      })
    } else {
      // Convert to CSV format (flatten the data structure)
      const csvData = []
      
      if (reportData.data.summary) {
        csvData.push(['SUMMARY'])
        csvData.push(['Metric', 'Value'])
        csvData.push(['Total Tasks', reportData.data.summary.totalTasks])
        csvData.push(['Completed Tasks', reportData.data.summary.completedTasks])
        csvData.push(['In Progress Tasks', reportData.data.summary.inProgressTasks])
        csvData.push(['Blocked Tasks', reportData.data.summary.blockedTasks])
        csvData.push(['Completion Rate (%)', reportData.data.summary.completionRate])
        csvData.push(['Avg Completion Time (days)', reportData.data.summary.avgCompletionTime])
        csvData.push([]) // Empty row
      }

      if (reportData.data.taskDistribution) {
        csvData.push(['TASK DISTRIBUTION BY STATUS'])
        csvData.push(['Status', 'Count'])
        reportData.data.taskDistribution.byStatus.forEach((item: any) => {
          csvData.push([item.status, item.count])
        })
        csvData.push([]) // Empty row

        csvData.push(['TASK DISTRIBUTION BY PRIORITY'])
        csvData.push(['Priority', 'Count'])
        reportData.data.taskDistribution.byPriority.forEach((item: any) => {
          csvData.push([item.priority, item.count])
        })
        csvData.push([]) // Empty row
      }

      if (reportData.data.agentWorkload) {
        csvData.push(['AGENT WORKLOAD'])
        csvData.push(['Agent', 'Role', 'Total Tasks', 'Completed', 'In Progress', 'Blocked'])
        reportData.data.agentWorkload.forEach((item: any) => {
          csvData.push([
            item.agentName || 'Unassigned',
            item.agentRole || '',
            item.totalTasks,
            item.completedTasks,
            item.inProgressTasks,
            item.blockedTasks
          ])
        })
        csvData.push([]) // Empty row
      }

      const csvContent = csvData.map(row => 
        row.map(cell => {
          const cellStr = cell?.toString() || ''
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      ).join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${reportType}-report-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}