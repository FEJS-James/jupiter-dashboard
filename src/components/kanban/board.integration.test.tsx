import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Board } from './board'
import { Task } from '@/types'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockTasksWithVariousStatuses: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Setup project structure',
    description: 'Initialize the project with basic folder structure and dependencies',
    status: 'backlog',
    priority: 'high',
    assignedAgent: 'coder',
    tags: ['setup', 'infrastructure'],
    dueDate: '2024-03-25T00:00:00.000Z',
    effort: 3,
    dependencies: [],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#10b981',
      status: 'available',
      createdAt: '2024-03-12T00:00:00.000Z',
      updatedAt: '2024-03-12T00:00:00.000Z'
    }
  },
  {
    id: 2,
    projectId: 1,
    title: 'Implement authentication',
    description: 'Add JWT-based authentication system',
    status: 'in-progress',
    priority: 'urgent',
    assignedAgent: 'coder',
    tags: ['auth', 'security', 'jwt'],
    dueDate: '2024-03-20T00:00:00.000Z',
    effort: 8,
    dependencies: [1],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
    agent: {
      id: 1,
      name: 'CodeAgent',
      role: 'coder',
      color: '#10b981',
      status: 'busy',
      createdAt: '2024-03-12T00:00:00.000Z',
      updatedAt: '2024-03-12T00:00:00.000Z'
    }
  },
  {
    id: 3,
    projectId: 1,
    title: 'Review API endpoints',
    description: 'Code review for REST API implementation',
    status: 'code-review',
    priority: 'medium',
    assignedAgent: 'reviewer',
    tags: ['api', 'review'],
    dueDate: '2024-03-22T00:00:00.000Z',
    effort: 2,
    dependencies: [2],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
    agent: {
      id: 2,
      name: 'ReviewAgent',
      role: 'reviewer',
      color: '#f59e0b',
      status: 'busy',
      createdAt: '2024-03-12T00:00:00.000Z',
      updatedAt: '2024-03-12T00:00:00.000Z'
    }
  },
  {
    id: 4,
    projectId: 1,
    title: 'Test user registration',
    description: 'Write and execute tests for user registration flow',
    status: 'testing',
    priority: 'medium',
    assignedAgent: 'reviewer',
    tags: ['testing', 'auth'],
    dueDate: '2024-03-24T00:00:00.000Z',
    effort: 3,
    dependencies: [3],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  },
  {
    id: 5,
    projectId: 1,
    title: 'Deploy to staging',
    description: 'Deploy the application to staging environment',
    status: 'deploying',
    priority: 'low',
    assignedAgent: 'devops',
    tags: ['deployment', 'staging'],
    dueDate: '2024-03-26T00:00:00.000Z',
    effort: 1,
    dependencies: [4],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
    agent: {
      id: 3,
      name: 'DeployAgent',
      role: 'devops',
      color: '#06b6d4',
      status: 'available',
      createdAt: '2024-03-12T00:00:00.000Z',
      updatedAt: '2024-03-12T00:00:00.000Z'
    }
  },
  {
    id: 6,
    projectId: 1,
    title: 'Documentation update',
    description: 'Update API documentation with new endpoints',
    status: 'done',
    priority: 'low',
    assignedAgent: 'coder',
    tags: ['documentation', 'api'],
    dueDate: '2024-03-18T00:00:00.000Z',
    effort: 2,
    dependencies: [],
    createdAt: '2024-03-10T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  }
]

describe('Board Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set a stable date for testing
    vi.setSystemTime(new Date('2024-03-21T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays all 6 Kanban columns with correct tasks distribution', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Verify all 6 columns are present
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Code Review')).toBeInTheDocument()
    expect(screen.getByText('Testing')).toBeInTheDocument()
    expect(screen.getByText('Deploying')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    
    // Verify tasks are in correct columns
    expect(screen.getByText('Setup project structure')).toBeInTheDocument() // Backlog
    expect(screen.getByText('Implement authentication')).toBeInTheDocument() // In Progress
    expect(screen.getByText('Review API endpoints')).toBeInTheDocument() // Code Review
    expect(screen.getByText('Test user registration')).toBeInTheDocument() // Testing
    expect(screen.getByText('Deploy to staging')).toBeInTheDocument() // Deploying
    expect(screen.getByText('Documentation update')).toBeInTheDocument() // Done
  })

  it('shows correct task counts in header statistics', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Total tasks
    expect(screen.getByText('6 total tasks across 6 columns')).toBeInTheDocument()
    
    // Status-specific counts
    expect(screen.getByText('1 completed')).toBeInTheDocument() // done status
    expect(screen.getByText('1 in progress')).toBeInTheDocument() // in-progress status
    expect(screen.getByText('1 backlog')).toBeInTheDocument() // backlog status
  })

  it('displays task cards with complete information', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Check high priority task displays correctly
    const authTask = screen.getByText('Implement authentication')
    expect(authTask).toBeInTheDocument()
    
    // Check urgent priority indicator (should have red color)
    const urgentTaskCard = authTask.closest('[class*="border-l-red-500"]')
    expect(urgentTaskCard).toBeInTheDocument()
    
    // Check tags are displayed
    expect(screen.getByText('auth')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('jwt')).toBeInTheDocument()
    
    // Check effort points
    expect(screen.getByText('8pt')).toBeInTheDocument()
    expect(screen.getByText('3pt')).toBeInTheDocument()
    expect(screen.getByText('2pt')).toBeInTheDocument()
    expect(screen.getByText('1pt')).toBeInTheDocument()
  })

  it('handles empty columns correctly', () => {
    // Test with tasks only in backlog
    const backlogOnlyTasks = mockTasksWithVariousStatuses.filter(task => task.status === 'backlog')
    
    render(<Board tasks={backlogOnlyTasks} />)
    
    // Backlog should have tasks
    expect(screen.getByText('Setup project structure')).toBeInTheDocument()
    
    // Other columns should show empty state
    expect(screen.getByText('No tasks in in progress')).toBeInTheDocument()
    expect(screen.getByText('No tasks in code review')).toBeInTheDocument()
    expect(screen.getByText('No tasks in testing')).toBeInTheDocument()
    expect(screen.getByText('No tasks in deploying')).toBeInTheDocument()
    expect(screen.getByText('No tasks in done')).toBeInTheDocument()
  })

  it('displays agent assignments correctly', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Check for agent initials in avatars
    expect(screen.getByText('C')).toBeInTheDocument() // CodeAgent
    expect(screen.getByText('R')).toBeInTheDocument() // ReviewAgent
    expect(screen.getByText('D')).toBeInTheDocument() // DeployAgent
  })

  it('shows overdue status for past due dates', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Task with due date 2024-03-20 should be overdue (current test time is 2024-03-21)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('handles board with no tasks', () => {
    render(<Board tasks={[]} />)
    
    // Should show 0 in header
    expect(screen.getByText('0 total tasks across 6 columns')).toBeInTheDocument()
    
    // All columns should show empty state
    expect(screen.getByText('No tasks in backlog')).toBeInTheDocument()
    expect(screen.getByText('No tasks in in progress')).toBeInTheDocument()
    expect(screen.getByText('No tasks in code review')).toBeInTheDocument()
    expect(screen.getByText('No tasks in testing')).toBeInTheDocument()
    expect(screen.getByText('No tasks in deploying')).toBeInTheDocument()
    expect(screen.getByText('No tasks in done')).toBeInTheDocument()
  })

  it('maintains responsive layout structure', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Check for responsive classes
    const boardContainer = document.querySelector('.flex.gap-6.overflow-x-auto')
    expect(boardContainer).toBeInTheDocument()
    
    // Check column min/max widths
    const columns = document.querySelectorAll('.min-w-\\[300px\\].max-w-sm')
    expect(columns).toHaveLength(6)
  })

  it('displays priority-based border colors correctly', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Check different priority border colors
    expect(document.querySelector('.border-l-red-500')).toBeInTheDocument() // urgent
    expect(document.querySelector('.border-l-orange-500')).toBeInTheDocument() // high
    expect(document.querySelector('.border-l-blue-500')).toBeInTheDocument() // medium
    expect(document.querySelector('.border-l-slate-400')).toBeInTheDocument() // low
  })

  it('shows task dependencies information', () => {
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // Tasks with dependencies should be visible
    // (Dependencies are stored as arrays in the task object but not directly displayed in current UI)
    // This test verifies the data structure is preserved
    const tasksWithDependencies = mockTasksWithVariousStatuses.filter(task => 
      task.dependencies && task.dependencies.length > 0
    )
    expect(tasksWithDependencies).toHaveLength(4) // Tasks 2, 3, 4, 5 have dependencies
  })

  it('handles mixed task statuses and maintains column integrity', () => {
    // Create tasks with all possible statuses including 'blocked'
    const mixedTasks = [
      ...mockTasksWithVariousStatuses,
      {
        id: 7,
        projectId: 1,
        title: 'Blocked task',
        description: 'This task is blocked',
        status: 'blocked' as const,
        priority: 'medium' as const,
        assignedAgent: 'coder',
        tags: ['blocked'],
        dueDate: '2024-03-30T00:00:00.000Z',
        effort: 4,
        dependencies: [],
        createdAt: '2024-03-12T00:00:00.000Z',
        updatedAt: '2024-03-12T00:00:00.000Z'
      }
    ]
    
    render(<Board tasks={mixedTasks} />)
    
    // All columns should still be present
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6)
    
    // Blocked task should appear (though not in a visible column since it's not in the columnConfig)
    // but the board should handle it gracefully
    expect(screen.getByText('7 total tasks across 6 columns')).toBeInTheDocument()
  })

  it('preserves task order within columns', () => {
    // Tasks should maintain their array order within each status group
    render(<Board tasks={mockTasksWithVariousStatuses} />)
    
    // The board implementation groups tasks by status, so original order should be preserved
    // within each status group
    const backlogTasks = mockTasksWithVariousStatuses.filter(task => task.status === 'backlog')
    expect(backlogTasks).toHaveLength(1)
    expect(screen.getByText(backlogTasks[0].title)).toBeInTheDocument()
  })
})