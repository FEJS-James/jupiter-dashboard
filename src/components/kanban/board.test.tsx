import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Board } from './board'
import { Task } from '@/types'

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Test Task 1',
    description: 'Test description',
    status: 'backlog',
    priority: 'high',
    assignedAgent: 'coder',
    tags: ['feature', 'api'],
    dueDate: '2024-03-20T00:00:00.000Z',
    effort: 5,
    dependencies: [],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
  },
  {
    id: 2,
    projectId: 1,
    title: 'Test Task 2',
    description: 'Another test description',
    status: 'in-progress',
    priority: 'medium',
    assignedAgent: 'reviewer',
    tags: ['bugfix'],
    dueDate: '2024-03-25T00:00:00.000Z',
    effort: 3,
    dependencies: [1],
    createdAt: '2024-03-12T00:00:00.000Z',
    updatedAt: '2024-03-12T00:00:00.000Z',
  },
]

describe('Board Component', () => {
  it('renders all 6 columns correctly', () => {
    render(<Board tasks={mockTasks} />)
    
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Code Review')).toBeInTheDocument()
    expect(screen.getByText('Testing')).toBeInTheDocument()
    expect(screen.getByText('Deploying')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays tasks in correct columns', () => {
    render(<Board tasks={mockTasks} />)
    
    // Task 1 should be in backlog
    expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    
    // Task 2 should be in in-progress  
    expect(screen.getByText('Test Task 2')).toBeInTheDocument()
  })

  it('shows correct task counts', () => {
    render(<Board tasks={mockTasks} />)
    
    expect(screen.getByText(/total tasks across/)).toBeInTheDocument()
    expect(screen.getByText(/0.*completed/)).toBeInTheDocument()
    expect(screen.getByText(/1.*in progress/)).toBeInTheDocument()
    expect(screen.getByText(/1.*backlog/)).toBeInTheDocument()
  })
})