import { http, HttpResponse } from 'msw'

// Mock data
const mockProjects = [
  { id: 1, name: 'Test Project 1', status: 'active' },
  { id: 2, name: 'Test Project 2', status: 'active' },
  { id: 3, name: 'Test Project 3', status: 'completed' }
]

const mockTasks = [
  {
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'in-progress',
    priority: 'high',
    assignedAgent: 'CodeAgent',
    tags: ['test', 'feature'],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    effort: 5,
    dependencies: null,
    createdAt: '2024-03-12T10:00:00Z',
    updatedAt: '2024-03-12T10:00:00Z',
    projectId: 1,
    project: { id: 1, name: 'Test Project 1', status: 'active' },
    agent: { id: 1, name: 'CodeAgent', role: 'coder', color: '#3b82f6', status: 'available' }
  },
  {
    id: 2,
    title: 'Test Task 2',
    description: 'Second test task',
    status: 'done',
    priority: 'medium',
    assignedAgent: 'ReviewAgent',
    tags: ['review'],
    dueDate: null,
    effort: 3,
    dependencies: null,
    createdAt: '2024-03-12T09:00:00Z',
    updatedAt: '2024-03-12T09:00:00Z',
    projectId: 1,
    project: { id: 1, name: 'Test Project 1', status: 'active' },
    agent: { id: 2, name: 'ReviewAgent', role: 'reviewer', color: '#10b981', status: 'busy' }
  },
  {
    id: 3,
    title: 'Test Task 3',
    description: 'Third test task',
    status: 'backlog',
    priority: 'low',
    assignedAgent: null,
    tags: null,
    dueDate: null,
    effort: null,
    dependencies: null,
    createdAt: '2024-03-12T08:00:00Z',
    updatedAt: '2024-03-12T08:00:00Z',
    projectId: 2,
    project: { id: 2, name: 'Test Project 2', status: 'active' },
    agent: null
  }
]

const mockAgents = [
  { id: 1, name: 'CodeAgent', role: 'coder', status: 'available', color: '#3b82f6' },
  { id: 2, name: 'ReviewAgent', role: 'reviewer', status: 'busy', color: '#10b981' },
  { id: 3, name: 'DeployAgent', role: 'deployer', status: 'available', color: '#f59e0b' }
]

const mockComments = [
  {
    id: 1,
    taskId: 1,
    content: 'This is a test comment',
    timestamp: '2024-03-12T11:00:00Z',
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#3b82f6'
    }
  }
]

const mockActivity = [
  {
    id: 1,
    projectId: 1,
    taskId: 1,
    agentId: 1,
    action: 'task_created',
    details: { priority: 'high' },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#3b82f6'
    },
    project: {
      id: 1,
      name: 'Test Project 1'
    },
    task: {
      id: 1,
      title: 'Test Task',
      status: 'in-progress'
    }
  },
  {
    id: 2,
    projectId: 1,
    taskId: 1,
    agentId: 1,
    action: 'task_moved',
    details: { fromStatus: 'backlog', toStatus: 'in-progress' },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#3b82f6'
    },
    project: {
      id: 1,
      name: 'Test Project 1'
    },
    task: {
      id: 1,
      title: 'Test Task',
      status: 'in-progress'
    }
  },
  {
    id: 3,
    projectId: 2,
    taskId: 3,
    agentId: 2,
    action: 'comment_added',
    details: { commentId: 1 },
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    agent: {
      id: 2,
      name: 'ReviewAgent',
      role: 'reviewer',
      color: '#10b981'
    },
    project: {
      id: 2,
      name: 'Test Project 2'
    },
    task: {
      id: 3,
      title: 'Test Task 3',
      status: 'backlog'
    }
  },
  {
    id: 4,
    projectId: null,
    taskId: null,
    agentId: 3,
    action: 'agent_joined',
    details: { role: 'deployer' },
    timestamp: new Date(Date.now() - 900000).toISOString(),
    agent: {
      id: 3,
      name: 'DeployAgent',
      role: 'deployer',
      color: '#f59e0b'
    },
    project: null,
    task: null
  },
  {
    id: 5,
    projectId: 1,
    taskId: 2,
    agentId: 2,
    action: 'task_completed',
    details: { duration: '2 hours' },
    timestamp: new Date(Date.now() - 300000).toISOString(),
    agent: {
      id: 2,
      name: 'ReviewAgent',
      role: 'reviewer',
      color: '#10b981'
    },
    project: {
      id: 1,
      name: 'Test Project 1'
    },
    task: {
      id: 2,
      title: 'Test Task 2',
      status: 'done'
    }
  }
]

export const handlers = [
  // Projects API
  http.get('/api/projects', () => {
    return HttpResponse.json({
      success: true,
      data: mockProjects
    })
  }),

  // Tasks API
  http.get('/api/tasks', ({ request }) => {
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit')
    const data = limit ? mockTasks.slice(0, parseInt(limit)) : mockTasks
    
    return HttpResponse.json({
      success: true,
      data
    })
  }),

  // Individual task API
  http.get('/api/tasks/:id', ({ params }) => {
    const id = parseInt(params.id as string)
    const task = mockTasks.find(t => t.id === id)
    
    if (!task) {
      return HttpResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    return HttpResponse.json({
      success: true,
      data: task
    })
  }),

  // Task update API
  http.patch('/api/tasks/:id', async ({ request, params }) => {
    const id = parseInt(params.id as string)
    const body = await request.json()
    const taskIndex = mockTasks.findIndex(t => t.id === id)
    
    if (taskIndex === -1) {
      return HttpResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Update mock task
    mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...body, updatedAt: new Date().toISOString() }
    
    return HttpResponse.json({
      success: true,
      data: mockTasks[taskIndex],
      message: 'Task updated successfully'
    })
  }),

  // Task creation API
  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json()
    const newTask = {
      id: Math.max(...mockTasks.map(t => t.id)) + 1,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      project: mockProjects.find(p => p.id === body.projectId) || null,
      agent: mockAgents.find(a => a.name === body.assignedAgent) || null
    }
    
    mockTasks.push(newTask)
    
    return HttpResponse.json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    })
  }),

  // Task move API
  http.patch('/api/tasks/:id/move', async ({ request, params }) => {
    const id = parseInt(params.id as string)
    const body = await request.json()
    const taskIndex = mockTasks.findIndex(t => t.id === id)
    
    if (taskIndex === -1) {
      return HttpResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    mockTasks[taskIndex].status = body.status
    mockTasks[taskIndex].updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      data: mockTasks[taskIndex],
      message: 'Task moved successfully'
    })
  }),

  // Comments API
  http.get('/api/tasks/:id/comments', ({ params }) => {
    const taskId = parseInt(params.id as string)
    const comments = mockComments.filter(c => c.taskId === taskId)
    
    return HttpResponse.json({
      success: true,
      data: comments
    })
  }),

  // Activity API
  http.get('/api/tasks/:id/activity', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: mockActivity
    })
  }),

  // Agents API
  http.get('/api/agents', () => {
    return HttpResponse.json({
      success: true,
      data: mockAgents
    })
  }),

  // Agent creation API
  http.post('/api/agents', async ({ request }) => {
    const body = await request.json()
    const newAgent = {
      id: Math.max(...mockAgents.map(a => a.id)) + 1,
      ...body,
      status: 'available'
    }
    
    mockAgents.push(newAgent)
    
    return HttpResponse.json({
      success: true,
      data: newAgent,
      message: 'Agent created successfully'
    })
  }),

  // Activity Feed API
  http.get('/api/activity', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const project = url.searchParams.get('project')
    const agent = url.searchParams.get('agent')
    const activityType = url.searchParams.get('activityType')
    const search = url.searchParams.get('search')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    let filteredActivity = [...mockActivity]

    // Apply filters
    if (project) {
      filteredActivity = filteredActivity.filter(a => a.projectId === parseInt(project))
    }

    if (agent) {
      filteredActivity = filteredActivity.filter(a => a.agentId === parseInt(agent))
    }

    if (activityType) {
      filteredActivity = filteredActivity.filter(a => a.action === activityType)
    }

    if (search) {
      filteredActivity = filteredActivity.filter(a => 
        a.action.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(a.details).toLowerCase().includes(search.toLowerCase())
      )
    }

    if (startDate) {
      filteredActivity = filteredActivity.filter(a => new Date(a.timestamp) >= new Date(startDate))
    }

    if (endDate) {
      filteredActivity = filteredActivity.filter(a => new Date(a.timestamp) <= new Date(endDate))
    }

    // Sort by timestamp (newest first)
    filteredActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Paginate
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = filteredActivity.slice(startIndex, endIndex)
    const hasMore = endIndex < filteredActivity.length

    return HttpResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        hasMore
      },
      hasMore
    })
  }),

  // Activity creation API
  http.post('/api/activity', async ({ request }) => {
    const body = await request.json()
    const newActivity = {
      id: Math.max(...mockActivity.map(a => a.id)) + 1,
      ...body,
      timestamp: new Date().toISOString()
    }

    // Add related data if provided
    if (body.projectId) {
      newActivity.project = mockProjects.find(p => p.id === body.projectId) || null
    }

    if (body.taskId) {
      newActivity.task = mockTasks.find(t => t.id === body.taskId) || null
    }

    if (body.agentId) {
      newActivity.agent = mockAgents.find(a => a.id === body.agentId) || null
    }

    mockActivity.push(newActivity)

    return HttpResponse.json({
      success: true,
      data: newActivity
    })
  }),

  // Activity stats API
  http.get('/api/activity/stats', () => {
    const totalActivities = mockActivity.length
    const last24Hours = mockActivity.filter(a => 
      new Date(a.timestamp) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length

    // Find most active project
    const projectCounts = mockActivity.reduce((acc, a) => {
      if (a.projectId) {
        acc[a.projectId] = (acc[a.projectId] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const mostActiveProjectId = Object.keys(projectCounts).reduce((a, b) => 
      projectCounts[parseInt(a)] > projectCounts[parseInt(b)] ? a : b
    )
    const mostActiveProject = mockProjects.find(p => p.id === parseInt(mostActiveProjectId))?.name || 'None'

    // Find most active agent
    const agentCounts = mockActivity.reduce((acc, a) => {
      if (a.agentId) {
        acc[a.agentId] = (acc[a.agentId] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)

    const mostActiveAgentId = Object.keys(agentCounts).reduce((a, b) => 
      agentCounts[parseInt(a)] > agentCounts[parseInt(b)] ? a : b
    )
    const mostActiveAgent = mockAgents.find(a => a.id === parseInt(mostActiveAgentId))?.name || 'None'

    // Get top activity types
    const actionCounts = mockActivity.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0)
    const topActivityTypes = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalActions > 0 ? (count / totalActions) * 100 : 0
      }))

    return HttpResponse.json({
      success: true,
      data: {
        totalActivities,
        activitiesLast24Hours: last24Hours,
        mostActiveProject,
        mostActiveAgent,
        topActivityTypes
      }
    })
  }),

  // Activity export API
  http.post('/api/activity/export', async ({ request }) => {
    const body = await request.json()
    const format = body.format || 'csv'

    let filteredActivity = [...mockActivity]

    // Apply filters if provided
    if (body.filters?.project) {
      filteredActivity = filteredActivity.filter(a => a.projectId === body.filters.project)
    }

    if (body.filters?.agent) {
      filteredActivity = filteredActivity.filter(a => a.agentId === body.filters.agent)
    }

    if (body.filters?.activityType) {
      filteredActivity = filteredActivity.filter(a => a.action === body.filters.activityType)
    }

    if (body.dateRange?.start) {
      filteredActivity = filteredActivity.filter(a => new Date(a.timestamp) >= new Date(body.dateRange.start))
    }

    if (body.dateRange?.end) {
      filteredActivity = filteredActivity.filter(a => new Date(a.timestamp) <= new Date(body.dateRange.end))
    }

    const limit = body.limit || 1000
    const exportData = filteredActivity.slice(0, limit)

    if (format === 'json') {
      return HttpResponse.json({
        success: true,
        data: exportData.map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          action: a.action,
          agentId: a.agentId,
          agentName: a.agent?.name || null,
          agentRole: a.agent?.role || null,
          projectId: a.projectId,
          projectName: a.project?.name || null,
          taskId: a.taskId,
          taskTitle: a.task?.title || null,
          taskStatus: a.task?.status || null,
          details: JSON.stringify(a.details || {})
        })),
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length,
          filters: body.filters || {},
          dateRange: body.dateRange || {}
        }
      })
    } else {
      // Return CSV format
      const csvHeaders = ['ID', 'Timestamp', 'Action', 'Agent Name', 'Project Name', 'Task Title', 'Details']
      const csvRows = exportData.map(a => [
        a.id.toString(),
        a.timestamp,
        a.action,
        a.agent?.name || '',
        a.project?.name || '',
        a.task?.title || '',
        JSON.stringify(a.details || {})
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return HttpResponse.text(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="activity-export.csv"'
        }
      })
    }
  }),

  // Activity export GET API
  http.get('/api/activity/export', ({ request }) => {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'csv'
    const limit = parseInt(url.searchParams.get('limit') || '1000')

    const exportData = mockActivity.slice(0, limit)

    if (format === 'json') {
      return HttpResponse.json({
        success: true,
        data: exportData.map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          action: a.action,
          agentName: a.agent?.name || null,
          projectName: a.project?.name || null,
          taskTitle: a.task?.title || null,
          details: JSON.stringify(a.details || {})
        })),
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length
        }
      })
    } else {
      const csvHeaders = ['ID', 'Timestamp', 'Action', 'Agent Name', 'Project Name', 'Task Title', 'Details']
      const csvRows = exportData.map(a => [
        a.id.toString(),
        a.timestamp,
        a.action,
        a.agent?.name || '',
        a.project?.name || '',
        a.task?.title || '',
        JSON.stringify(a.details || {})
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return HttpResponse.text(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="activity-export.csv"'
        }
      })
    }
  })
]