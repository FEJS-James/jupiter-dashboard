import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskFiltersComponent } from './task-filters'
import { TaskFilters, FilterStats } from '@/hooks/use-task-filters'
import { Task, TaskStatus, TaskPriority, Project, Agent } from '@/types'

const mockFilters: TaskFilters = {
  search: '',
  statuses: [],
  priorities: [],
  assignees: [],
  projectIds: [],
  tags: []
}

const mockFilterStats: FilterStats = {
  totalTasks: 10,
  filteredTasks: 8,
  statusCounts: {
    'backlog': 3,
    'in-progress': 2,
    'code-review': 1,
    'testing': 1,
    'deploying': 1,
    'done': 2,
    'blocked': 0
  },
  priorityCounts: {
    'low': 2,
    'medium': 4,
    'high': 3,
    'urgent': 1
  },
  assigneeCounts: {
    'Agent 1': 5,
    'Agent 2': 3,
    'Agent 3': 2
  },
  projectCounts: {
    1: 6,
    2: 4
  }
}

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'backlog' as TaskStatus,
    priority: 'high' as TaskPriority,
    assignedAgent: 'Agent 1',
    tags: ['frontend', 'react'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  }
]

const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Project 1',
    description: 'First project',
    status: 'active',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 2,
    name: 'Project 2',
    description: 'Second project',
    status: 'active',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  }
]

const mockAgents: Agent[] = [
  {
    id: 1,
    name: 'Agent 1',
    role: 'coder',
    color: '#ff0000',
    status: 'available',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 2,
    name: 'Agent 2',
    role: 'reviewer',
    color: '#00ff00',
    status: 'available',
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  }
]

const defaultProps = {
  filters: mockFilters,
  onFiltersChange: vi.fn(),
  onClearFilters: vi.fn(),
  filterStats: mockFilterStats,
  tasks: mockTasks,
  projects: mockProjects,
  agents: mockAgents,
  isLoading: false
}

// Mock the Popover components to avoid portal issues in tests
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>
}))

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div data-testid="command">{children}</div>,
  CommandInput: (props: any) => <input data-testid="command-input" {...props} />,
  CommandList: ({ children }: { children: React.ReactNode }) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="command-group">{children}</div>,
  CommandItem: ({ children, onSelect }: { children: React.ReactNode, onSelect: () => void }) => 
    <div data-testid="command-item" onClick={onSelect}>{children}</div>
}))

describe('TaskFiltersComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with initial state', () => {
    render(<TaskFiltersComponent {...defaultProps} />)
    
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument()
    expect(screen.getByText('8 of 10 tasks')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search in title and description...')).toBeInTheDocument()
  })

  it('calls onFiltersChange when search input changes', async () => {
    const user = userEvent.setup()
    render(<TaskFiltersComponent {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Search in title and description...')
    await user.clear(searchInput)
    await user.type(searchInput, 'test search')
    
    expect(defaultProps.onFiltersChange).toHaveBeenLastCalledWith({ search: 'test search' })
  })

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup()
    const propsWithSearch = {
      ...defaultProps,
      filters: { ...mockFilters, search: 'test' }
    }
    
    render(<TaskFiltersComponent {...propsWithSearch} />)
    
    const clearButton = screen.getByText(/×/).closest('button')
    expect(clearButton).toBeInTheDocument()
    await user.click(clearButton!)
    
    expect(defaultProps.onFiltersChange).toHaveBeenCalledWith({ search: '' })
  })

  it('shows active filters when filters are applied', () => {
    const filtersWithActive = {
      ...mockFilters,
      search: 'test search',
      statuses: ['backlog'] as TaskStatus[],
      priorities: ['high'] as TaskPriority[]
    }
    
    render(<TaskFiltersComponent {...defaultProps} filters={filtersWithActive} />)
    
    expect(screen.getByText('Active Filters')).toBeInTheDocument()
    expect(screen.getByText('"test search"')).toBeInTheDocument()
  })

  it('calls onClearFilters when clear all button is clicked', async () => {
    const user = userEvent.setup()
    const filtersWithActive = {
      ...mockFilters,
      search: 'test',
      statuses: ['backlog'] as TaskStatus[]
    }
    
    render(<TaskFiltersComponent {...defaultProps} filters={filtersWithActive} />)
    
    const clearAllButton = screen.getByText('Clear all')
    await user.click(clearAllButton)
    
    expect(defaultProps.onClearFilters).toHaveBeenCalled()
  })

  it('shows loading indicator when isLoading is true', () => {
    render(<TaskFiltersComponent {...defaultProps} isLoading={true} />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays filter statistics correctly', () => {
    render(<TaskFiltersComponent {...defaultProps} />)
    
    expect(screen.getByText('8 of 10 tasks')).toBeInTheDocument()
  })

  it('shows multi-select filter buttons with correct labels', () => {
    render(<TaskFiltersComponent {...defaultProps} />)
    
    expect(screen.getByText('All statuses')).toBeInTheDocument()
    expect(screen.getByText('All priorities')).toBeInTheDocument()
    expect(screen.getByText('All assignees')).toBeInTheDocument()
    expect(screen.getByText('All projects')).toBeInTheDocument()
  })

  it('updates button labels when filters are selected', () => {
    const filtersWithSelections = {
      ...mockFilters,
      statuses: ['backlog', 'in-progress'] as TaskStatus[],
      priorities: ['high'] as TaskPriority[]
    }
    
    render(<TaskFiltersComponent {...defaultProps} filters={filtersWithSelections} />)
    
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show tags filter when no tags exist', () => {
    const tasksWithoutTags = mockTasks.map(task => ({ ...task, tags: undefined }))
    
    render(<TaskFiltersComponent {...defaultProps} tasks={tasksWithoutTags} />)
    
    expect(screen.queryByText('All tags')).not.toBeInTheDocument()
  })

  it('shows tags filter when tasks have tags', () => {
    render(<TaskFiltersComponent {...defaultProps} />)
    
    expect(screen.getByText('All tags')).toBeInTheDocument()
  })
})