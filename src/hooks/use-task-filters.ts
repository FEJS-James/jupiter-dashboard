'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Task, TaskStatus, TaskPriority } from '@/types'

export interface TaskFilters {
  search: string
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  assignees: string[]
  projectIds: number[]
  tags: string[]
}

export interface FilterStats {
  totalTasks: number
  filteredTasks: number
  statusCounts: Record<TaskStatus, number>
  priorityCounts: Record<TaskPriority, number>
  assigneeCounts: Record<string, number>
  projectCounts: Record<number, number>
}

interface UseTaskFiltersReturn {
  filters: TaskFilters
  setFilters: (filters: Partial<TaskFilters>) => void
  clearFilters: () => void
  debouncedSearch: string
  filteredTasks: Task[]
  filterStats: FilterStats
  isLoading: boolean
}

const defaultFilters: TaskFilters = {
  search: '',
  statuses: [],
  priorities: [],
  assignees: [],
  projectIds: [],
  tags: []
}

/**
 * Parse filter state from URLSearchParams (pure function, no side effects).
 */
function parseFiltersFromParams(params: URLSearchParams): TaskFilters {
  return {
    search: params.get('search') || '',
    statuses: params.getAll('status') as TaskStatus[],
    priorities: params.getAll('priority') as TaskPriority[],
    assignees: params.getAll('assignee'),
    projectIds: params.getAll('project').map(id => parseInt(id)).filter(id => !isNaN(id)),
    tags: params.getAll('tag'),
  }
}

/**
 * Serialize filter state to a query-string (without leading '?').
 */
function serializeFilters(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  filters.statuses.forEach(s => params.append('status', s))
  filters.priorities.forEach(p => params.append('priority', p))
  filters.assignees.forEach(a => params.append('assignee', a))
  filters.projectIds.forEach(id => params.append('project', id.toString()))
  filters.tags.forEach(t => params.append('tag', t))
  return params.toString()
}

export function useTaskFilters(tasks: Task[]): UseTaskFiltersReturn {
  const searchParams = useSearchParams()

  // ── Source of truth: local React state ──
  // URL is a *best-effort* mirror — we never let a failed URL update
  // overwrite the user's filter selection.
  const didInitFromURL = useRef(false)
  const [filters, setFiltersState] = useState<TaskFilters>(() => {
    // Eager initialiser: read URL params on first render so SSR/hydration
    // picks up deep-linked filters.
    if (searchParams) {
      return parseFiltersFromParams(searchParams)
    }
    return defaultFilters
  })

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [isLoading, setIsLoading] = useState(false)

  // One-time sync from URL on mount (covers the case where the eager
  // initialiser ran before searchParams was available, e.g. Suspense).
  useEffect(() => {
    if (didInitFromURL.current || !searchParams) return
    didInitFromURL.current = true
    const parsed = parseFiltersFromParams(searchParams)
    // Only overwrite if URL actually carries filter params
    const hasParams = parsed.search || parsed.statuses.length || parsed.priorities.length ||
      parsed.assignees.length || parsed.projectIds.length || parsed.tags.length
    if (hasParams) {
      setFiltersState(parsed)
      setDebouncedSearch(parsed.search)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, [searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)

    return () => clearTimeout(timer)
  }, [filters.search])

  // Best-effort URL mirror — fires after state is already committed so a
  // failed router.replace() can never revert the user's selection.
  const syncURLBestEffort = useCallback((newFilters: TaskFilters) => {
    try {
      const qs = serializeFilters(newFilters)
      const newUrl = qs ? `?${qs}` : window.location.pathname
      // Use History API directly — avoids React startTransition which can be
      // silently dropped on pages with heavy concurrent updates (DnD, WebSocket).
      window.history.replaceState(window.history.state, '', newUrl)
    } catch {
      // URL update is non-critical; swallow errors.
    }
  }, [])

  const setFilters = useCallback((partialFilters: Partial<TaskFilters>) => {
    setIsLoading(true)

    setFiltersState(prev => {
      const next = { ...prev, ...partialFilters }
      // Schedule URL sync outside the render cycle
      queueMicrotask(() => syncURLBestEffort(next))
      return next
    })

    // Brief loading state for better UX
    setTimeout(() => setIsLoading(false), 100)
  }, [syncURLBestEffort])

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    syncURLBestEffort(defaultFilters)
  }, [syncURLBestEffort])

  // Optimized task filtering with memoization
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Performance optimization: early return if no filters
    const hasFilters = debouncedSearch || 
      filters.statuses.length > 0 || 
      filters.priorities.length > 0 || 
      filters.assignees.length > 0 || 
      filters.projectIds.length > 0 || 
      filters.tags.length > 0

    if (!hasFilters) {
      return tasks
    }

    // Search filter (title and description)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      )
    }

    // Status filter
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(task => filters.statuses.includes(task.status))
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = filtered.filter(task => filters.priorities.includes(task.priority))
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      filtered = filtered.filter(task => 
        task.assignedAgent && filters.assignees.includes(task.assignedAgent)
      )
    }

    // Project filter
    if (filters.projectIds.length > 0) {
      filtered = filtered.filter(task => filters.projectIds.includes(task.projectId))
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(task => 
        task.tags && task.tags.some(tag => filters.tags.includes(tag))
      )
    }

    return filtered
  }, [tasks, debouncedSearch, filters])

  // Calculate filter statistics
  const filterStats: FilterStats = useMemo(() => {
    const statusCounts: Record<TaskStatus, number> = {
      'backlog': 0,
      'in-progress': 0,
      'code-review': 0,
      'testing': 0,
      'deploying': 0,
      'done': 0,
      'blocked': 0,
      'archived': 0
    }

    const priorityCounts: Record<TaskPriority, number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'urgent': 0
    }

    const assigneeCounts: Record<string, number> = {}
    const projectCounts: Record<number, number> = {}

    // Count all tasks (not just filtered)
    tasks.forEach(task => {
      statusCounts[task.status]++
      priorityCounts[task.priority]++
      
      if (task.assignedAgent) {
        assigneeCounts[task.assignedAgent] = (assigneeCounts[task.assignedAgent] || 0) + 1
      }
      
      projectCounts[task.projectId] = (projectCounts[task.projectId] || 0) + 1
    })

    return {
      totalTasks: tasks.length,
      filteredTasks: filteredTasks.length,
      statusCounts,
      priorityCounts,
      assigneeCounts,
      projectCounts
    }
  }, [tasks, filteredTasks])

  return {
    filters,
    setFilters,
    clearFilters,
    debouncedSearch,
    filteredTasks,
    filterStats,
    isLoading
  }
}