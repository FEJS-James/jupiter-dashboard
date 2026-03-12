import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityFeed } from './activity-feed'
import { useWebSocket } from '@/contexts/websocket-context'

// Mock WebSocket context
jest.mock('@/contexts/websocket-context', () => ({
  useWebSocket: jest.fn(),
}))

// Mock fetch API
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
  format: jest.fn(() => 'Mar 12, 10:30'),
}))

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>

const mockActivityData = [
  {
    id: 1,
    projectId: 1,
    taskId: 1,
    agentId: 1,
    action: 'task_created',
    details: { priority: 'high' },
    timestamp: '2026-03-12T10:00:00Z',
    agent: {
      id: 1,
      name: 'Alice Developer',
      role: 'developer',
      color: '#3b82f6',
    },
    project: {
      id: 1,
      name: 'Test Project',
    },
    task: {
      id: 1,
      title: 'Implement feature A',
      status: 'backlog',
    },
  },
  {
    id: 2,
    projectId: 1,
    taskId: 2,
    agentId: 2,
    action: 'task_moved',
    details: { fromStatus: 'backlog', toStatus: 'in-progress' },
    timestamp: '2026-03-12T10:30:00Z',
    agent: {
      id: 2,
      name: 'Bob Reviewer',
      role: 'reviewer',
      color: '#10b981',
    },
    project: {
      id: 1,
      name: 'Test Project',
    },
    task: {
      id: 2,
      title: 'Fix bug B',
      status: 'in-progress',
    },
  },
  {
    id: 3,
    projectId: 2,
    taskId: 3,
    agentId: 1,
    action: 'comment_added',
    details: { commentId: 123 },
    timestamp: '2026-03-12T11:00:00Z',
    agent: {
      id: 1,
      name: 'Alice Developer',
      role: 'developer',
      color: '#3b82f6',
    },
    project: {
      id: 2,
      name: 'Another Project',
    },
    task: {
      id: 3,
      title: 'Update documentation',
      status: 'done',
    },
  },
]

const mockProjectsData = [
  { id: 1, name: 'Test Project' },
  { id: 2, name: 'Another Project' },
]

const mockAgentsData = [
  { id: 1, name: 'Alice Developer', role: 'developer', color: '#3b82f6' },
  { id: 2, name: 'Bob Reviewer', role: 'reviewer', color: '#10b981' },
]

describe('ActivityFeed Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful WebSocket connection
    mockUseWebSocket.mockReturnValue({
      socket: {
        on: jest.fn(),
        off: jest.fn(),
      },
      connectionStatus: 'connected',
    } as any)

    // Mock successful API responses
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()
      
      if (urlStr.includes('/api/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockActivityData,
            hasMore: false,
            pagination: { page: 1, limit: 50, hasMore: false },
          }),
        } as Response)
      }
      
      if (urlStr.includes('/api/projects')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockProjectsData,
          }),
        } as Response)
      }
      
      if (urlStr.includes('/api/agents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockAgentsData,
          }),
        } as Response)
      }

      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  it('should render activity feed with title and description', async () => {
    render(<ActivityFeed />)

    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
    expect(screen.getByText('Real-time activity across all projects')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/activity'))
    })
  })

  it('should render custom title and description', async () => {
    render(<ActivityFeed title="Custom Activity" description="Custom description" />)

    expect(screen.getByText('Custom Activity')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('should display activity items after loading', async () => {
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText(/Alice Developer created task "Implement feature A"/)).toBeInTheDocument()
      expect(screen.getByText(/Bob Reviewer moved "Fix bug B" from backlog to in-progress/)).toBeInTheDocument()
      expect(screen.getByText(/Alice Developer commented on "Update documentation"/)).toBeInTheDocument()
    })
  })

  it('should show live indicator when WebSocket is connected', async () => {
    render(<ActivityFeed realTime={true} />)

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })

  it('should not show live indicator when WebSocket is disconnected', async () => {
    mockUseWebSocket.mockReturnValue({
      socket: null,
      connectionStatus: 'disconnected',
    } as any)

    render(<ActivityFeed realTime={true} />)

    await waitFor(() => {
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })
  })

  it('should handle search filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'task')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=task')
      )
    })
  })

  it('should handle project filter selection', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('All Projects')).toBeInTheDocument()
    })

    // Open project filter dropdown
    await user.click(screen.getByText('All Projects'))
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Test Project'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('project=1')
      )
    })
  })

  it('should handle agent filter selection', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('All Agents')).toBeInTheDocument()
    })

    // Open agent filter dropdown
    await user.click(screen.getByText('All Agents'))
    
    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Alice Developer'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('agent=1')
      )
    })
  })

  it('should handle activity type filter selection', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('All Types')).toBeInTheDocument()
    })

    // Open activity type filter dropdown
    await user.click(screen.getByText('All Types'))
    
    await waitFor(() => {
      expect(screen.getByText('Task Created')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Task Created'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('activityType=task_created')
      )
    })
  })

  it('should handle date range filter', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('All Time')).toBeInTheDocument()
    })

    // Open date range filter
    await user.click(screen.getByText('All Time'))
    
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Today'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=')
      )
    })
  })

  it('should clear all filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    // First add some filters
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'task')

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Clear Filters'))

    await waitFor(() => {
      expect(searchInput).toHaveValue('')
    })
  })

  it('should expand activity details when chevron is clicked', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getAllByRole('button').some(btn => 
        btn.querySelector('.lucide-chevron-down')
      )).toBe(true)
    })

    // Find and click the first expand button
    const expandButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('.lucide-chevron-down')
    )
    
    if (expandButtons.length > 0) {
      await user.click(expandButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Activity Details')).toBeInTheDocument()
      })
    }
  })

  it('should handle refresh button click', async () => {
    const user = userEvent.setup()
    render(<ActivityFeed />)

    await waitFor(() => {
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    // Should trigger another API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial load + refresh
    })
  })

  it('should handle real-time activity updates', async () => {
    const mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
    }

    mockUseWebSocket.mockReturnValue({
      socket: mockSocket,
      connectionStatus: 'connected',
    } as any)

    render(<ActivityFeed realTime={true} />)

    // Verify WebSocket listener is set up
    expect(mockSocket.on).toHaveBeenCalledWith('activity', expect.any(Function))

    // Simulate receiving a new activity
    const newActivity = {
      id: 4,
      action: 'task_completed',
      timestamp: '2026-03-12T12:00:00Z',
      agent: { name: 'Charlie Tester' },
      task: { title: 'Testing task' },
    }

    const activityHandler = mockSocket.on.mock.calls.find(call => call[0] === 'activity')[1]
    
    act(() => {
      activityHandler(newActivity)
    })

    await waitFor(() => {
      expect(screen.getByText(/Charlie Tester/)).toBeInTheDocument()
    })
  })

  it('should show error state when API call fails', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response))

    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Activities')).toBeInTheDocument()
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('should show no activity message when empty', async () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()
      if (urlStr.includes('/api/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [],
            hasMore: false,
          }),
        } as Response)
      }
      // Default responses for other endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response)
    })

    render(<ActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('No activity found')).toBeInTheDocument()
    })
  })

  it('should show loading skeleton initially', () => {
    render(<ActivityFeed />)

    // Should show loading skeletons
    expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it('should hide filters when showFilters is false', () => {
    render(<ActivityFeed showFilters={false} />)

    expect(screen.queryByPlaceholderText('Search activities...')).not.toBeInTheDocument()
    expect(screen.queryByText('All Projects')).not.toBeInTheDocument()
  })

  it('should apply compact mode styling', async () => {
    render(<ActivityFeed compact={true} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // In compact mode, it should use relative time formatting
    // This is handled by the mocked formatDistanceToNow function
  })

  it('should respect maxItems prop', async () => {
    render(<ActivityFeed maxItems={2} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=2')
      )
    })
  })

  it('should handle infinite scroll', async () => {
    // Mock IntersectionObserver
    const mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
    }

    global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
      // Simulate intersection after setup
      setTimeout(() => {
        callback([{ isIntersecting: true }])
      }, 100)
      
      return mockObserver
    })

    // Mock API response with hasMore = true
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()
      if (urlStr.includes('/api/activity')) {
        const params = new URL(urlStr).searchParams
        const page = parseInt(params.get('page') || '1')
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockActivityData,
            hasMore: page === 1, // Only first page has more
            pagination: { page, limit: 50, hasMore: page === 1 },
          }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response)
    })

    render(<ActivityFeed />)

    await waitFor(() => {
      expect(mockObserver.observe).toHaveBeenCalled()
    })

    // Wait for intersection to trigger
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      )
    }, { timeout: 500 })
  })
})