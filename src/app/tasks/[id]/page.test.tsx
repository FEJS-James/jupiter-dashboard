import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { server } from '@/test/mocks/server'
import TaskDetailPage from './page'

// Disable MSW for this test file — uses manual fetch mocking
beforeAll(() => { server.close() })
afterAll(() => { server.listen({ onUnhandledRequest: 'warn' }) })

// Mock Next.js router
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock task form dialog
vi.mock('@/components/kanban/task-form-dialog', () => ({
  TaskFormDialog: ({ open, task }: { open: boolean; task: any }) => (
    open ? <div data-testid="task-form-dialog">Task Form Dialog for {task?.title}</div> : null
  ),
}))

// Mock comments section to avoid its own fetching
vi.mock('@/components/comments/comments-section', () => ({
  CommentsSection: ({ taskId }: { taskId: number }) => (
    <div data-testid="comments-section">Comments for task {taskId}</div>
  ),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockTask = {
  id: 1,
  projectId: 1,
  title: 'Test Task',
  description: 'Test task description',
  status: 'in-progress' as const,
  priority: 'high' as const,
  assignedAgent: 1,
  tags: ['frontend', 'urgent'],
  dueDate: '2024-03-15T10:00:00Z',
  effort: 5,
  dependencies: [],
  createdAt: '2024-03-01T10:00:00Z',
  updatedAt: '2024-03-10T15:30:00Z',
  project: {
    id: 1,
    name: 'Test Project',
    status: 'active' as const,
  },
  agent: {
    id: 1,
    name: 'Coder Agent',
    role: 'coder' as const,
    color: '#3b82f6',
    status: 'busy' as const,
  }
}

const mockProjects = [
  { id: 1, name: 'Test Project', status: 'active' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
]

const mockAgents = [
  { id: 1, name: 'Coder Agent', role: 'coder' as const, color: '#3b82f6', status: 'busy' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, name: 'Reviewer Agent', role: 'reviewer' as const, color: '#10b981', status: 'available' as const, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
]

const mockActivity = [
  {
    id: 1,
    action: 'created',
    details: { status: 'backlog' },
    timestamp: '2024-03-01T10:00:00Z',
    agent: { id: 2, name: 'Manager Agent', role: 'manager', color: '#8b5cf6' }
  },
  {
    id: 2,
    action: 'moved',
    details: { from: 'backlog', to: 'in-progress' },
    timestamp: '2024-03-10T09:00:00Z',
    agent: { id: 1, name: 'Coder Agent', role: 'coder', color: '#3b82f6' }
  }
]

function setupFetchMocks() {
  // The component fetches in this order:
  // 1. Promise.all([task, projects, agents]) — 3 simultaneous fetches
  // 2. Activity (after agents load)
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/tasks/1/activity')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockActivity }),
      })
    }
    if (url.includes('/api/tasks/1') && !url.includes('comments') && !url.includes('move') && !url.includes('activity')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTask }),
      })
    }
    if (url.includes('/api/projects')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockProjects }),
      })
    }
    if (url.includes('/api/agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockAgents }),
      })
    }
    if (url.includes('/api/activity')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockActivity }),
      })
    }
    // Default
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    })
  })
}

describe('TaskDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupFetchMocks()
  })

  it('renders task detail page with task information', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    // Wait for task data to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Task').length).toBeGreaterThan(0)
    })

    // Check task details are displayed
    expect(screen.getByText('Test task description')).toBeInTheDocument()
    
    // Check status and priority badges
    expect(screen.getAllByText(/in.progress/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/high/i).length).toBeGreaterThan(0)
    
    // Check tags
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
    
    // Check assignee is shown (component shows the raw assignedAgent value)
    expect(screen.getByText('Assignee:')).toBeInTheDocument()
  })

  it('displays comments section', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByTestId('comments-section')).toBeInTheDocument()
    })

    expect(screen.getByText('Comments for task 1')).toBeInTheDocument()
  })

  it('displays activity history', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    // Wait for task to load first
    await waitFor(() => {
      expect(screen.getAllByText('Test Task').length).toBeGreaterThan(0)
    })

    // Activity loads after agents are available — may need extra render cycles
    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Check activity items are displayed
    expect(screen.getByText(/created this task/)).toBeInTheDocument()
  })

  it('handles task not found error', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/tasks/999')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    })

    const mockParams = Promise.resolve({ id: '999' })
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument()
    })
  })

  it('allows editing task when edit button is clicked', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    // Wait for task to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Task').length).toBeGreaterThan(0)
    })

    // Find and click the edit button
    const editButton = screen.getByText('Edit Task')
    fireEvent.click(editButton)

    // Should show the task form dialog
    await waitFor(() => {
      expect(screen.getByTestId('task-form-dialog')).toBeInTheDocument()
    })
  })
})
