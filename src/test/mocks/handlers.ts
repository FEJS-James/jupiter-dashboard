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
    action: 'created',
    details: { status: 'backlog' },
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#3b82f6'
    }
  },
  {
    id: 2,
    action: 'moved',
    details: { from: 'backlog', to: 'in-progress' },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#3b82f6'
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
  })
]