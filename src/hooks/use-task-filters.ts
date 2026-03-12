'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

export function useTaskFilters(tasks: Task[]): UseTaskFiltersReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFiltersState] = useState<TaskFilters>(defaultFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Initialize filters from URL params on mount
  useEffect(() => {
    if (!searchParams) return
    
    const urlFilters: TaskFilters = {
      search: searchParams.get('search') || '',
      statuses: searchParams.getAll('status') as TaskStatus[],
      priorities: searchParams.getAll('priority') as TaskPriority[],
      assignees: searchParams.getAll('assignee'),
      projectIds: searchParams.getAll('project').map(id => parseInt(id)).filter(id => !isNaN(id)),
      tags: searchParams.getAll('tag')
    }

    setFiltersState(urlFilters)
    setDebouncedSearch(urlFilters.search)
  }, [searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)

    return () => clearTimeout(timer)
  }, [filters.search])

  // Update URL when filters change
  const updateURL = useCallback((newFilters: TaskFilters) => {
    const params = new URLSearchParams()
    
    if (newFilters.search) params.set('search', newFilters.search)
    newFilters.statuses.forEach(status => params.append('status', status))
    newFilters.priorities.forEach(priority => params.append('priority', priority))
    newFilters.assignees.forEach(assignee => params.append('assignee', assignee))
    newFilters.projectIds.forEach(id => params.append('project', id.toString()))
    newFilters.tags.forEach(tag => params.append('tag', tag))

    const newUrl = params.toString() ? `?${params.toString()}` : ''
    
    // Use replace to avoid cluttering browser history
    router.replace(newUrl, { scroll: false })
  }, [router])

  const setFilters = useCallback((partialFilters: Partial<TaskFilters>) => {
    setIsLoading(true)
    
    const newFilters = { ...filters, ...partialFilters }
    setFiltersState(newFilters)
    updateURL(newFilters)
    
    // Brief loading state for better UX
    setTimeout(() => setIsLoading(false), 100)
  }, [filters, updateURL])

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    updateURL(defaultFilters)
  }, [updateURL])

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
      'blocked': 0
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