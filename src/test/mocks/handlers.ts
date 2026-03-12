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
    title: 'Test Task 1',
    status: 'in-progress',
    priority: 'high',
    createdAt: '2024-03-12T10:00:00Z',
    projectId: 1,
    project: { name: 'Test Project 1' },
    agent: { name: 'CodeAgent', role: 'coder', color: '#3b82f6' }
  },
  {
    id: 2,
    title: 'Test Task 2',
    status: 'done',
    priority: 'medium',
    createdAt: '2024-03-12T09:00:00Z',
    projectId: 1,
    project: { name: 'Test Project 1' },
    agent: { name: 'ReviewAgent', role: 'reviewer', color: '#10b981' }
  }
]

const mockAgents = [
  { id: 1, name: 'CodeAgent', role: 'coder', status: 'available', color: '#3b82f6' },
  { id: 2, name: 'ReviewAgent', role: 'reviewer', status: 'busy', color: '#10b981' },
  { id: 3, name: 'DeployAgent', role: 'deployer', status: 'available', color: '#f59e0b' }
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

  // Agents API
  http.get('/api/agents', () => {
    return HttpResponse.json({
      success: true,
      data: mockAgents
    })
  })
]