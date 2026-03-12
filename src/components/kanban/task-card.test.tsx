import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TaskCard } from './task-card'
import { Task } from '@/types'

const mockTask: Task = {
  id: 1,
  projectId: 1,
  title: 'Implement user authentication',
  description: 'Add login and signup functionality with JWT tokens',
  status: 'in-progress',
  priority: 'high',
  assignedAgent: 'coder',
  tags: ['authentication', 'security', 'jwt', 'api'],
  dueDate: '2024-03-25T00:00:00.000Z',
  effort: 8,
  dependencies: [2, 3],
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
}

const mockTaskOverdue: Task = {
  ...mockTask,
  id: 2,
  dueDate: '2024-03-10T00:00:00.000Z', // Past date
  priority: 'urgent',
  tags: ['urgent', 'bugfix']
}

const mockTaskMinimal: Task = {
  ...mockTask,
  id: 3,
  description: undefined,
  tags: undefined,
  dueDate: undefined,
  effort: undefined,
  agent: undefined,
  priority: 'low'
}

describe('TaskCard Component', () => {
  it('renders task title and description', () => {
    render(<TaskCard task={mockTask} />)
    
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
    expect(screen.getByText(/Add login and signup functionality/)).toBeInTheDocument()
  })

  it('displays priority indicators correctly', () => {
    render(<TaskCard task={mockTask} />)
    
    // High priority should have an alert icon
    expect(screen.getByRole('generic').querySelector('.text-orange-500')).toBeInTheDocument()
  })

  it('shows urgent priority with red icon', () => {
    render(<TaskCard task={mockTaskOverdue} />)
    
    expect(screen.getByRole('generic').querySelector('.text-red-500')).toBeInTheDocument()
  })

  it('renders up to 3 tags with overflow indicator', () => {
    render(<TaskCard task={mockTask} />)
    
    expect(screen.getByText('authentication')).toBeInTheDocument()
    expect(screen.getByText('security')).toBeInTheDocument()
    expect(screen.getByText('jwt')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument() // 4 tags total, showing +1 more
  })

  it('displays effort points when available', () => {
    render(<TaskCard task={mockTask} />)
    
    expect(screen.getByText('8pt')).toBeInTheDocument()
  })

  it('shows agent avatar and initial when agent is assigned', () => {
    render(<TaskCard task={mockTask} />)
    
    const avatar = screen.getByText('C') // First letter of CodeAgent
    expect(avatar).toBeInTheDocument()
  })

  it('displays due date and shows overdue status', () => {
    render(<TaskCard task={mockTaskOverdue} />)
    
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('shows relative due date for future dates', () => {
    // Mock current date to be before the due date
    const mockDate = new Date('2024-03-20T00:00:00.000Z')
    vi.setSystemTime(mockDate)
    
    render(<TaskCard task={mockTask} />)
    
    // Should show "in X days" format
    expect(screen.getByText(/in \d+ days/)).toBeInTheDocument()
    
    vi.useRealTimers()
  })

  it('renders correctly without optional fields', () => {
    render(<TaskCard task={mockTaskMinimal} />)
    
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
    expect(screen.queryByText(/Add login and signup functionality/)).not.toBeInTheDocument()
    expect(screen.queryByText(/pt$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ago|in \d+ days/)).not.toBeInTheDocument()
  })

  it('shows hover actions on card hover', () => {
    render(<TaskCard task={mockTask} />)
    
    const card = screen.getByRole('generic', { name: /task.*card/i })
    fireEvent.mouseEnter(card)
    
    // Check for edit and delete buttons (they start hidden)
    const editButton = screen.getByRole('button', { name: /edit/i })
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    
    expect(editButton).toBeInTheDocument()
    expect(deleteButton).toBeInTheDocument()
  })

  it('calls appropriate handlers when action buttons are clicked', () => {
    const mockStopPropagation = vi.fn()
    
    render(<TaskCard task={mockTask} />)
    
    // Find buttons and simulate clicks
    const editButton = screen.getByRole('button', { name: /edit/i })
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    
    // Create mock event object
    const mockEvent = { stopPropagation: mockStopPropagation }
    
    fireEvent.click(editButton, mockEvent)
    fireEvent.click(deleteButton, mockEvent)
    
    // Events should prevent bubbling
    expect(mockStopPropagation).toHaveBeenCalledTimes(2)
  })

  it('displays correct styling for different priorities', () => {
    const { rerender } = render(<TaskCard task={{ ...mockTask, priority: 'low' }} />)
    
    let card = screen.getByRole('generic', { name: /task.*card/i })
    expect(card).toHaveClass('border-l-slate-400')
    
    rerender(<TaskCard task={{ ...mockTask, priority: 'medium' }} />)
    card = screen.getByRole('generic', { name: /task.*card/i })
    expect(card).toHaveClass('border-l-blue-500')
    
    rerender(<TaskCard task={{ ...mockTask, priority: 'high' }} />)
    card = screen.getByRole('generic', { name: /task.*card/i })
    expect(card).toHaveClass('border-l-orange-500')
    
    rerender(<TaskCard task={{ ...mockTask, priority: 'urgent' }} />)
    card = screen.getByRole('generic', { name: /task.*card/i })
    expect(card).toHaveClass('border-l-red-500')
  })

  it('shows assigned agent with fallback styling when no agent object', () => {
    const taskWithStringAgent = { ...mockTask, agent: undefined, assignedAgent: 'reviewer' }
    render(<TaskCard task={taskWithStringAgent} />)
    
    expect(screen.getByText('R')).toBeInTheDocument() // First letter of 'reviewer'
  })
})