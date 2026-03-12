import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TaskDetailPage from './page'

// Mock Next.js router
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
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
  assignedAgent: 'coder-agent',
  tags: ['frontend', 'urgent'],
  dueDate: '2024-03-15T10:00:00Z',
  effort: 5,
  dependencies: [2, 3],
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
  { 
    id: 1, 
    name: 'Test Project', 
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

const mockAgents = [
  { 
    id: 1, 
    name: 'Coder Agent', 
    role: 'coder' as const, 
    color: '#3b82f6',
    status: 'busy' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  { 
    id: 2, 
    name: 'Reviewer Agent', 
    role: 'reviewer' as const, 
    color: '#10b981',
    status: 'available' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

const mockComments = [
  {
    id: 1,
    taskId: 1,
    content: 'This is a test comment',
    timestamp: '2024-03-05T14:30:00Z',
    agent: {
      id: 1,
      name: 'Coder Agent',
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
    timestamp: '2024-03-01T10:00:00Z',
    agent: {
      id: 2,
      name: 'Manager Agent',
      role: 'manager',
      color: '#8b5cf6'
    }
  },
  {
    id: 2,
    action: 'moved',
    details: { from: 'backlog', to: 'in-progress' },
    timestamp: '2024-03-10T09:00:00Z',
    agent: {
      id: 1,
      name: 'Coder Agent',
      role: 'coder',
      color: '#3b82f6'
    }
  }
]

describe('TaskDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default fetch responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockTask }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockProjects }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockAgents }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockComments }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockActivity }),
      })
  })

  it('renders task detail page with task information', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    // Check loading state first
    expect(screen.getByTestId(/skeleton|loading/i) || screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for task data to load
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })

    // Check task details are displayed
    expect(screen.getByText('Test task description')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Coder Agent')).toBeInTheDocument()
    
    // Check status and priority badges
    expect(screen.getByText(/in progress/i)).toBeInTheDocument()
    expect(screen.getByText(/high/i)).toBeInTheDocument()
    
    // Check tags
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
  })

  it('displays comments section', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByText('Comments (1)')).toBeInTheDocument()
    })

    expect(screen.getByText('This is a test comment')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
  })

  it('displays activity history', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument()
    })

    expect(screen.getByText(/created this task/)).toBeInTheDocument()
    expect(screen.getByText(/moved task from backlog to in-progress/)).toBeInTheDocument()
  })

  it('handles task not found error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Task not found' }),
      })

    const mockParams = Promise.resolve({ id: '999' })
    
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByText('Task not found')).toBeInTheDocument()
    })
  })

  it('allows editing task when edit button is clicked', async () => {
    const mockParams = Promise.resolve({ id: '1' })
    
    render(<TaskDetailPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })

    // Click edit button
    const editButton = screen.getAllByText(/edit/i)[0]
    editButton.click()

    // Check that task form dialog opens
    await waitFor(() => {
      expect(screen.getByTestId('task-form-dialog')).toBeInTheDocument()
    })
  })
})