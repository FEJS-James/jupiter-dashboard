import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Column } from './column'
import { Task } from '@/types'

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Task 1',
    description: 'First task',
    status: 'in-progress',
    priority: 'high',
    assignedAgent: 'coder',
    tags: ['feature'],
    dueDate: '2024-03-25T00:00:00.000Z',
    effort: 5,
    dependencies: [],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  },
  {
    id: 2,
    projectId: 1,
    title: 'Task 2',
    description: 'Second task',
    status: 'in-progress',
    priority: 'medium',
    assignedAgent: 'reviewer',
    tags: ['bugfix'],
    dueDate: '2024-03-30T00:00:00.000Z',
    effort: 3,
    dependencies: [1],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z'
  }
]

const emptyTasks: Task[] = []

describe('Column Component', () => {
  it('renders column title with correct icon', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument() // in-progress icon
  })

  it('displays correct task count', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    expect(screen.getByText('2')).toBeInTheDocument() // 2 tasks in mockTasks
  })

  it('renders all status icons correctly', () => {
    const statuses = [
      { status: 'backlog' as const, icon: '📋' },
      { status: 'in-progress' as const, icon: '🔄' },
      { status: 'code-review' as const, icon: '👁️' },
      { status: 'testing' as const, icon: '🧪' },
      { status: 'deploying' as const, icon: '🚀' },
      { status: 'done' as const, icon: '✅' },
      { status: 'blocked' as const, icon: '🚫' }
    ]

    statuses.forEach(({ status, icon }) => {
      render(<Column title={status} status={status} tasks={[]} color="#333" />)
      expect(screen.getByText(icon)).toBeInTheDocument()
    })
  })

  it('shows progress bar with correct width and color', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    const progressBar = document.querySelector('[style*="background-color: #10b981"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveStyle({ width: '50%' }) // Default completion ratio for in-progress
  })

  it('shows full progress for done status', () => {
    render(<Column title="Done" status="done" tasks={mockTasks} color="#059669" />)
    
    const progressBar = document.querySelector('[style*="width: 100%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('shows zero progress for blocked status', () => {
    render(<Column title="Blocked" status="blocked" tasks={mockTasks} color="#ef4444" />)
    
    const progressBar = document.querySelector('[style*="width: 0%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('renders all task cards when tasks are present', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(<Column title="Backlog" status="backlog" tasks={emptyTasks} color="#64748b" />)
    
    expect(screen.getByText('No tasks in backlog')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument() // Empty state icon
  })

  it('has add task button that is clickable', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    const addButton = screen.getByRole('button')
    expect(addButton).toBeInTheDocument()
    
    // Simulate click
    fireEvent.click(addButton)
    // Note: The actual handler is not implemented yet (TODO in component)
  })

  it('has minimum height for tasks container', () => {
    render(<Column title="In Progress" status="in-progress" tasks={emptyTasks} color="#10b981" />)
    
    const tasksContainer = document.querySelector('.min-h-\\[200px\\]')
    expect(tasksContainer).toBeInTheDocument()
  })

  it('applies correct CSS classes for column layout', () => {
    render(<Column title="In Progress" status="in-progress" tasks={mockTasks} color="#10b981" />)
    
    const column = document.querySelector('.flex-1.min-w-\\[300px\\].max-w-sm')
    expect(column).toBeInTheDocument()
  })

  it('shows correct task count in different scenarios', () => {
    const { rerender } = render(
      <Column title="Testing" status="testing" tasks={[]} color="#8b5cf6" />
    )
    expect(screen.getByText('0')).toBeInTheDocument()

    rerender(<Column title="Testing" status="testing" tasks={[mockTasks[0]]} color="#8b5cf6" />)
    expect(screen.getByText('1')).toBeInTheDocument()

    rerender(<Column title="Testing" status="testing" tasks={mockTasks} color="#8b5cf6" />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('maintains proper spacing between task cards', () => {
    render(<Column title="Code Review" status="code-review" tasks={mockTasks} color="#f59e0b" />)
    
    const tasksContainer = document.querySelector('.space-y-0')
    expect(tasksContainer).toBeInTheDocument()
  })

  it('applies hover effects to add button', () => {
    render(<Column title="Deploying" status="deploying" tasks={mockTasks} color="#06b6d4" />)
    
    const addButton = screen.getByRole('button')
    expect(addButton).toHaveClass('hover:text-slate-300', 'hover:bg-slate-800')
  })
})