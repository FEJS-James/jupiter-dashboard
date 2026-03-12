import { vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskFilters } from './use-task-filters'
import { Task, TaskStatus, TaskPriority } from '@/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
  }),
  useSearchParams: () => ({
    get: () => null,
    getAll: () => []
  })
}))

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Test Task 1',
    description: 'Description for task 1',
    status: 'backlog' as TaskStatus,
    priority: 'high' as TaskPriority,
    assignedAgent: 'Agent 1',
    tags: ['frontend', 'react'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  {
    id: 2,
    projectId: 2,
    title: 'Test Task 2',
    description: 'Description for task 2',
    status: 'in-progress' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assignedAgent: 'Agent 2',
    tags: ['backend', 'api'],
    createdAt: '2023-01-02',
    updatedAt: '2023-01-02'
  },
  {
    id: 3,
    projectId: 1,
    title: 'Another Task',
    description: 'Different description',
    status: 'done' as TaskStatus,
    priority: 'low' as TaskPriority,
    assignedAgent: 'Agent 1',
    tags: ['testing'],
    createdAt: '2023-01-03',
    updatedAt: '2023-01-03'
  }
]

describe('useTaskFilters', () => {
  it('should return all tasks when no filters are applied', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    expect(result.current.filteredTasks).toHaveLength(3)
    expect(result.current.filterStats.totalTasks).toBe(3)
    expect(result.current.filterStats.filteredTasks).toBe(3)
  })

  it('should filter tasks by search term in title', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ search: 'Another' })
    })

    // Wait for debounced search
    setTimeout(() => {
      expect(result.current.filteredTasks).toHaveLength(1)
      expect(result.current.filteredTasks[0].title).toBe('Another Task')
    }, 350)
  })

  it('should filter tasks by search term in description', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ search: 'Different' })
    })

    setTimeout(() => {
      expect(result.current.filteredTasks).toHaveLength(1)
      expect(result.current.filteredTasks[0].description).toBe('Different description')
    }, 350)
  })

  it('should filter tasks by status', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ statuses: ['in-progress'] })
    })

    expect(result.current.filteredTasks).toHaveLength(1)
    expect(result.current.filteredTasks[0].status).toBe('in-progress')
  })

  it('should filter tasks by multiple statuses', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ statuses: ['backlog', 'done'] })
    })

    expect(result.current.filteredTasks).toHaveLength(2)
    expect(result.current.filteredTasks.map(t => t.status)).toEqual(['backlog', 'done'])
  })

  it('should filter tasks by priority', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ priorities: ['high'] })
    })

    expect(result.current.filteredTasks).toHaveLength(1)
    expect(result.current.filteredTasks[0].priority).toBe('high')
  })

  it('should filter tasks by assignee', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ assignees: ['Agent 1'] })
    })

    expect(result.current.filteredTasks).toHaveLength(2)
    expect(result.current.filteredTasks.every(t => t.assignedAgent === 'Agent 1')).toBe(true)
  })

  it('should filter tasks by project ID', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ projectIds: [1] })
    })

    expect(result.current.filteredTasks).toHaveLength(2)
    expect(result.current.filteredTasks.every(t => t.projectId === 1)).toBe(true)
  })

  it('should filter tasks by tags', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ tags: ['frontend'] })
    })

    expect(result.current.filteredTasks).toHaveLength(1)
    expect(result.current.filteredTasks[0].tags).toContain('frontend')
  })

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ 
        statuses: ['backlog', 'done'], 
        assignees: ['Agent 1']
      })
    })

    expect(result.current.filteredTasks).toHaveLength(2)
    expect(result.current.filteredTasks.every(t => 
      ['backlog', 'done'].includes(t.status) && t.assignedAgent === 'Agent 1'
    )).toBe(true)
  })

  it('should clear all filters', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    act(() => {
      result.current.setFilters({ statuses: ['backlog'], priorities: ['high'] })
    })

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.filters.statuses).toHaveLength(0)
    expect(result.current.filters.priorities).toHaveLength(0)
    expect(result.current.filteredTasks).toHaveLength(3)
  })

  it('should calculate correct filter statistics', () => {
    const { result } = renderHook(() => useTaskFilters(mockTasks))

    expect(result.current.filterStats.statusCounts.backlog).toBe(1)
    expect(result.current.filterStats.statusCounts['in-progress']).toBe(1)
    expect(result.current.filterStats.statusCounts.done).toBe(1)
    
    expect(result.current.filterStats.priorityCounts.high).toBe(1)
    expect(result.current.filterStats.priorityCounts.medium).toBe(1)
    expect(result.current.filterStats.priorityCounts.low).toBe(1)
    
    expect(result.current.filterStats.assigneeCounts['Agent 1']).toBe(2)
    expect(result.current.filterStats.assigneeCounts['Agent 2']).toBe(1)
  })
})