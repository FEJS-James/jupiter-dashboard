import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArchiveView } from './archive-view'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockArchivedTasks = [
  {
    id: 10,
    projectId: 1,
    title: 'Archived Feature A',
    description: 'Old feature',
    status: 'archived',
    priority: 'low',
    assignedAgent: 'coder',
    tags: ['legacy'],
    dueDate: null,
    effort: null,
    dependencies: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    project: { id: 1, name: 'Project Alpha', status: 'active' },
    agent: { id: 1, name: 'coder', role: 'coder', color: '#10b981', status: 'available' },
  },
  {
    id: 11,
    projectId: 1,
    title: 'Archived Bug Fix B',
    description: null,
    status: 'archived',
    priority: 'high',
    assignedAgent: null,
    tags: null,
    dueDate: null,
    effort: null,
    dependencies: null,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    project: { id: 1, name: 'Project Alpha', status: 'active' },
    agent: null,
  },
]

describe('ArchiveView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return archived tasks
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { tasks: mockArchivedTasks, total: 2, limit: 50, offset: 0 },
        }),
    })
  })

  it('renders the collapsed archive header with badge count', async () => {
    render(<ArchiveView />)

    expect(screen.getByText('Archived Tasks')).toBeInTheDocument()
    // Wait for fetch to complete and badge to render
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('expands panel on click and shows archived task titles', async () => {
    render(<ArchiveView />)

    // Click to expand
    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getByText('Archived Feature A')).toBeInTheDocument()
      expect(screen.getByText('Archived Bug Fix B')).toBeInTheDocument()
    })
  })

  it('shows priority badges on archived tasks', async () => {
    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getByText('low')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })
  })

  it('shows project name for archived tasks', async () => {
    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      const projectNames = screen.getAllByText('Project Alpha')
      expect(projectNames.length).toBeGreaterThan(0)
    })
  })

  it('renders unarchive button for each task', async () => {
    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      const unarchiveButtons = screen.getAllByText('Unarchive')
      expect(unarchiveButtons).toHaveLength(2)
    })
  })

  it('shows empty state when no archived tasks', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { tasks: [], total: 0, limit: 50, offset: 0 },
        }),
    })

    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getByText('No archived tasks')).toBeInTheDocument()
    })
  })

  it('shows search bar when expanded', async () => {
    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search archived tasks...')).toBeInTheDocument()
    })
  })

  it('calls fetch with search parameter when searching', async () => {
    render(<ArchiveView />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search archived tasks...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search archived tasks...')
    fireEvent.change(searchInput, { target: { value: 'Feature' } })

    await waitFor(() => {
      // Verify fetch was called with search param
      const fetchCalls = (global.fetch as any).mock.calls
      const lastCall = fetchCalls[fetchCalls.length - 1][0]
      expect(lastCall).toContain('search=Feature')
    })
  })

  it('calls onTasksChanged callback when unarchiving a task', async () => {
    const onTasksChanged = vi.fn()

    // First call returns tasks, unarchive call succeeds
    let callCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/tasks/archived')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { tasks: mockArchivedTasks, total: 2, limit: 50, offset: 0 },
            }),
        })
      }
      // The unarchive call (POST to /api/tasks/:id/move)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    })

    render(<ArchiveView onTasksChanged={onTasksChanged} />)

    fireEvent.click(screen.getByText('Archived Tasks'))

    await waitFor(() => {
      expect(screen.getAllByText('Unarchive')).toHaveLength(2)
    })

    // Click first unarchive button
    fireEvent.click(screen.getAllByText('Unarchive')[0])

    await waitFor(() => {
      expect(onTasksChanged).toHaveBeenCalled()
    })
  })
})
