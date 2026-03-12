import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activity, agents, projects, tasks } from '@/lib/schema'
import { desc, eq, and, gte, lte, or, like } from 'drizzle-orm'
import { z } from 'zod'
import { format } from 'date-fns'

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  filters: z.object({
    project: z.coerce.number().optional(),
    agent: z.coerce.number().optional(),
    activityType: z.string().optional(),
  }).optional(),
  limit: z.coerce.number().min(1).max(10000).default(1000),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse and validate request body
    const parsed = exportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { format: exportFormat, dateRange, filters, limit } = parsed.data

    // Build where conditions
    const conditions = []

    // Date range filters
    if (dateRange?.start) {
      conditions.push(gte(activity.timestamp, new Date(dateRange.start)))
    }

    if (dateRange?.end) {
      conditions.push(lte(activity.timestamp, new Date(dateRange.end)))
    }

    // Filter conditions
    if (filters?.project) {
      conditions.push(eq(activity.projectId, filters.project))
    }

    if (filters?.agent) {
      conditions.push(eq(activity.agentId, filters.agent))
    }

    if (filters?.activityType) {
      conditions.push(eq(activity.action, filters.activityType))
    }

    // Fetch activities with related data
    const activities = await db
      .select({
        activity: activity,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
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
      .limit(limit)

    // Transform data for export
    const exportData = activities.map(result => ({
      id: result.activity.id,
      timestamp: result.activity.timestamp.toISOString(),
      action: result.activity.action,
      agentId: result.activity.agentId,
      agentName: result.agent?.name || null,
      agentRole: result.agent?.role || null,
      projectId: result.activity.projectId,
      projectName: result.project?.name || null,
      taskId: result.activity.taskId,
      taskTitle: result.task?.title || null,
      taskStatus: result.task?.status || null,
      details: JSON.stringify(result.activity.details || {}),
    }))

    if (exportFormat === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length,
          filters: filters || {},
          dateRange: dateRange || {}
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="activity-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json"`
        }
      })
    } else {
      // Generate CSV
      const csvHeaders = [
        'ID',
        'Timestamp',
        'Action',
        'Agent ID',
        'Agent Name',
        'Agent Role',
        'Project ID', 
        'Project Name',
        'Task ID',
        'Task Title',
        'Task Status',
        'Details'
      ]

      const csvRows = exportData.map(row => [
        row.id.toString(),
        format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        row.action,
        row.agentId?.toString() || '',
        row.agentName || '',
        row.agentRole || '',
        row.projectId?.toString() || '',
        row.projectName || '',
        row.taskId?.toString() || '',
        row.taskTitle || '',
        row.taskStatus || '',
        row.details
      ])

      // Escape CSV values
      const escapeCsvValue = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('Activity export error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for simple CSV export with query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const exportFormat = (searchParams.get('format') || 'csv') as 'csv' | 'json'
    const limit = parseInt(searchParams.get('limit') || '1000')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectFilter = searchParams.get('project') ? parseInt(searchParams.get('project')!) : undefined
    const agentFilter = searchParams.get('agent') ? parseInt(searchParams.get('agent')!) : undefined
    const activityTypeFilter = searchParams.get('activityType')

    // Build where conditions
    const conditions = []

    if (startDate) {
      conditions.push(gte(activity.timestamp, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(activity.timestamp, new Date(endDate)))
    }

    if (projectFilter) {
      conditions.push(eq(activity.projectId, projectFilter))
    }

    if (agentFilter) {
      conditions.push(eq(activity.agentId, agentFilter))
    }

    if (activityTypeFilter) {
      conditions.push(eq(activity.action, activityTypeFilter))
    }

    // Fetch activities with related data
    const activities = await db
      .select({
        activity: activity,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
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
      .limit(Math.min(limit, 10000)) // Cap at 10k for GET requests

    // Transform data for export
    const exportData = activities.map(result => ({
      id: result.activity.id,
      timestamp: result.activity.timestamp.toISOString(),
      action: result.activity.action,
      agentId: result.activity.agentId,
      agentName: result.agent?.name || null,
      agentRole: result.agent?.role || null,
      projectId: result.activity.projectId,
      projectName: result.project?.name || null,
      taskId: result.activity.taskId,
      taskTitle: result.task?.title || null,
      taskStatus: result.task?.status || null,
      details: JSON.stringify(result.activity.details || {}),
    }))

    if (exportFormat === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="activity-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json"`
        }
      })
    } else {
      // Generate CSV
      const csvHeaders = [
        'ID',
        'Timestamp',
        'Action',
        'Agent ID',
        'Agent Name',
        'Agent Role',
        'Project ID', 
        'Project Name',
        'Task ID',
        'Task Title',
        'Task Status',
        'Details'
      ]

      const csvRows = exportData.map(row => [
        row.id.toString(),
        format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        row.action,
        row.agentId?.toString() || '',
        row.agentName || '',
        row.agentRole || '',
        row.projectId?.toString() || '',
        row.projectName || '',
        row.taskId?.toString() || '',
        row.taskTitle || '',
        row.taskStatus || '',
        row.details
      ])

      // Escape CSV values
      const escapeCsvValue = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(escapeCsvValue).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv"`
        }
      })
    }
    
  } catch (error) {
    console.error('Activity export (GET) error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}