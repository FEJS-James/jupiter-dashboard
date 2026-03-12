import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, agents, projects } from '@/lib/schema'
import { desc, eq, and, gte, lte, or, like, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { format as formatDate } from 'date-fns'
import { requireAuth } from '@/lib/auth'

const taskExportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  fields: z.array(z.string()).optional().default([
    'id', 'title', 'status', 'priority', 'assignedAgent', 'tags', 
    'dueDate', 'effort', 'createdAt', 'updatedAt', 'projectName'
  ]),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
  filters: z.object({
    project: z.coerce.number().optional(),
    status: z.array(z.string()).optional(),
    priority: z.array(z.string()).optional(),
    assignedAgent: z.string().optional(),
    tags: z.array(z.string()).optional(),
    searchTerm: z.string().optional(),
    taskIds: z.array(z.number()).optional(), // For bulk exports
  }).optional(),
  dateFormat: z.enum(['iso', 'us', 'eu']).default('iso'),
  delimiter: z.enum(['comma', 'semicolon', 'tab']).default('comma'),
  encoding: z.enum(['utf-8', 'windows-1252']).default('utf-8'),
  limit: z.coerce.number().min(1).max(50000).default(1000),
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
    const parsed = taskExportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: parsed.error.issues
      }, { status: 400 })
    }

    const { 
      format: exportFormat, 
      fields, 
      dateRange, 
      filters, 
      dateFormat,
      delimiter,
      encoding,
      limit 
    } = parsed.data

    // Build where conditions
    const conditions = []

    // Date range filters
    if (dateRange?.start) {
      conditions.push(gte(tasks.createdAt, new Date(dateRange.start)))
    }

    if (dateRange?.end) {
      conditions.push(lte(tasks.createdAt, new Date(dateRange.end)))
    }

    // Filter conditions
    if (filters?.project) {
      conditions.push(eq(tasks.projectId, filters.project))
    }

    if (filters?.status && filters.status.length > 0) {
      conditions.push(inArray(tasks.status, filters.status as any))
    }

    if (filters?.priority && filters.priority.length > 0) {
      conditions.push(inArray(tasks.priority, filters.priority as any))
    }

    if (filters?.assignedAgent) {
      conditions.push(eq(tasks.assignedAgent, filters.assignedAgent))
    }

    if (filters?.taskIds && filters.taskIds.length > 0) {
      conditions.push(inArray(tasks.id, filters.taskIds))
    }

    if (filters?.searchTerm) {
      const searchTerm = `%${filters.searchTerm}%`
      conditions.push(
        or(
          like(tasks.title, searchTerm),
          like(tasks.description, searchTerm)
        )
      )
    }

    // Fetch tasks with related data
    const tasksData = await db
      .select({
        task: tasks,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)

    // Transform data for export based on selected fields
    const formatDate = (date: Date, format: string) => {
      switch (format) {
        case 'us':
          return date.toLocaleDateString('en-US')
        case 'eu':
          return date.toLocaleDateString('en-GB')
        default:
          return date.toISOString()
      }
    }

    const exportData = tasksData.map(result => {
      const baseData: Record<string, any> = {}
      
      if (fields.includes('id')) baseData.id = result.task.id
      if (fields.includes('title')) baseData.title = result.task.title || ''
      if (fields.includes('description')) baseData.description = result.task.description || ''
      if (fields.includes('status')) baseData.status = result.task.status
      if (fields.includes('priority')) baseData.priority = result.task.priority
      if (fields.includes('assignedAgent')) baseData.assignedAgent = result.task.assignedAgent || ''
      if (fields.includes('agentName')) baseData.agentName = result.agent?.name || ''
      if (fields.includes('agentRole')) baseData.agentRole = result.agent?.role || ''
      if (fields.includes('projectId')) baseData.projectId = result.task.projectId
      if (fields.includes('projectName')) baseData.projectName = result.project?.name || ''
      if (fields.includes('tags')) baseData.tags = Array.isArray(result.task.tags) ? result.task.tags.join('; ') : ''
      if (fields.includes('dueDate')) baseData.dueDate = result.task.dueDate ? formatDate(result.task.dueDate, dateFormat) : ''
      if (fields.includes('effort')) baseData.effort = result.task.effort || ''
      if (fields.includes('dependencies')) baseData.dependencies = Array.isArray(result.task.dependencies) ? result.task.dependencies.join('; ') : ''
      if (fields.includes('createdAt')) baseData.createdAt = formatDate(result.task.createdAt, dateFormat)
      if (fields.includes('updatedAt')) baseData.updatedAt = formatDate(result.task.updatedAt, dateFormat)

      return baseData
    })

    if (exportFormat === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length,
          filters: filters || {},
          dateRange: dateRange || {},
          fields,
          dateFormat,
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="tasks-export-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.json"`
        }
      })
    } else {
      // Generate CSV
      const getDelimiter = (type: string) => {
        switch (type) {
          case 'semicolon': return ';'
          case 'tab': return '\t'
          default: return ','
        }
      }

      const csvDelimiter = getDelimiter(delimiter)
      
      // Create headers from selected fields
      const csvHeaders = fields.map(field => {
        const headerMap: Record<string, string> = {
          id: 'ID',
          title: 'Title',
          description: 'Description',
          status: 'Status',
          priority: 'Priority',
          assignedAgent: 'Assigned Agent',
          agentName: 'Agent Name',
          agentRole: 'Agent Role',
          projectId: 'Project ID',
          projectName: 'Project Name',
          tags: 'Tags',
          dueDate: 'Due Date',
          effort: 'Effort',
          dependencies: 'Dependencies',
          createdAt: 'Created At',
          updatedAt: 'Updated At',
        }
        return headerMap[field] || field
      })

      const csvRows = exportData.map(row => 
        fields.map(field => row[field]?.toString() || '')
      )

      // Escape CSV values
      const escapeCsvValue = (value: string) => {
        if (value.includes(csvDelimiter) || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const csvContent = [
        csvHeaders.join(csvDelimiter),
        ...csvRows.map(row => row.map(escapeCsvValue).join(csvDelimiter))
      ].join('\n')

      // Handle encoding
      let responseBody: string | ArrayBuffer = csvContent
      let contentType = 'text/csv; charset=utf-8'
      
      if (encoding === 'windows-1252') {
        // Convert to Windows-1252 encoding
        const buffer = Buffer.from(csvContent, 'utf8')
        responseBody = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        contentType = 'text/csv; charset=windows-1252'
      }

      return new NextResponse(responseBody, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="tasks-export-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.csv"`
        }
      })
    }

  } catch (error) {
    console.error('Task export error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for simple exports with query parameters
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { session, error } = requireAuth(request)
    if (error) {
      return error
    }

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const exportFormat = (searchParams.get('format') || 'csv') as 'csv' | 'json'
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 50000)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectFilter = searchParams.get('project') ? parseInt(searchParams.get('project')!) : undefined
    const statusFilter = searchParams.get('status')?.split(',')
    const priorityFilter = searchParams.get('priority')?.split(',')
    const assignedAgentFilter = searchParams.get('assignedAgent')
    const searchTerm = searchParams.get('search')

    // Build where conditions
    const conditions = []

    if (startDate) {
      conditions.push(gte(tasks.createdAt, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(tasks.createdAt, new Date(endDate)))
    }

    if (projectFilter) {
      conditions.push(eq(tasks.projectId, projectFilter))
    }

    if (statusFilter && statusFilter.length > 0) {
      conditions.push(inArray(tasks.status, statusFilter as any))
    }

    if (priorityFilter && priorityFilter.length > 0) {
      conditions.push(inArray(tasks.priority, priorityFilter as any))
    }

    if (assignedAgentFilter) {
      conditions.push(eq(tasks.assignedAgent, assignedAgentFilter))
    }

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`
      conditions.push(
        or(
          like(tasks.title, searchPattern),
          like(tasks.description, searchPattern)
        )
      )
    }

    // Fetch tasks with related data
    const tasksData = await db
      .select({
        task: tasks,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
        },
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)

    // Transform data for export
    const exportData = tasksData.map(result => ({
      id: result.task.id,
      title: result.task.title || '',
      description: result.task.description || '',
      status: result.task.status,
      priority: result.task.priority,
      assignedAgent: result.task.assignedAgent || '',
      agentName: result.agent?.name || '',
      agentRole: result.agent?.role || '',
      projectId: result.task.projectId,
      projectName: result.project?.name || '',
      tags: Array.isArray(result.task.tags) ? result.task.tags.join('; ') : '',
      dueDate: result.task.dueDate ? result.task.dueDate.toISOString() : '',
      effort: result.task.effort || '',
      dependencies: Array.isArray(result.task.dependencies) ? result.task.dependencies.join('; ') : '',
      createdAt: result.task.createdAt.toISOString(),
      updatedAt: result.task.updatedAt.toISOString(),
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
          'Content-Disposition': `attachment; filename="tasks-export-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.json"`
        }
      })
    } else {
      // Generate CSV
      const csvHeaders = [
        'ID', 'Title', 'Description', 'Status', 'Priority', 'Assigned Agent',
        'Agent Name', 'Agent Role', 'Project ID', 'Project Name', 'Tags',
        'Due Date', 'Effort', 'Dependencies', 'Created At', 'Updated At'
      ]

      const csvRows = exportData.map(row => [
        row.id.toString(),
        row.title,
        row.description,
        row.status,
        row.priority,
        row.assignedAgent,
        row.agentName,
        row.agentRole,
        row.projectId.toString(),
        row.projectName,
        row.tags,
        row.dueDate,
        row.effort.toString(),
        row.dependencies,
        row.createdAt,
        row.updatedAt
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
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="tasks-export-${formatDate(new Date(), 'yyyy-MM-dd-HHmm')}.csv"`
        }
      })
    }
    
  } catch (error) {
    console.error('Task export (GET) error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}