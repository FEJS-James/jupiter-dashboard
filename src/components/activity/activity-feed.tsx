'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWebSocket } from '@/contexts/websocket-context'
import {
  Activity,
  Search,
  RefreshCw,
  Calendar,
  User,
  FolderOpen,
  ChevronDown,
  MessageSquare,
  Move,
  Plus,
  Trash,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Settings
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: number
  projectId?: number
  taskId?: number
  agentId?: number
  action: string
  details: Record<string, unknown>
  timestamp: string
  agent?: {
    id: number
    name: string
    role: string
    color: string
    avatarUrl?: string
  }
  project?: {
    id: number
    name: string
  }
  task?: {
    id: number
    title: string
    status: string
  }
}

interface ActivityFilters {
  project?: string
  agent?: string
  activityType?: string
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

interface ActivityFeedProps {
  maxItems?: number
  showFilters?: boolean
  compact?: boolean
  realTime?: boolean
  className?: string
  title?: string
  description?: string
}

const ACTIVITY_TYPES = {
  task_created: { icon: Plus, label: 'Task Created', color: 'green' },
  task_updated: { icon: Settings, label: 'Task Updated', color: 'blue' },
  task_deleted: { icon: Trash, label: 'Task Deleted', color: 'red' },
  task_moved: { icon: Move, label: 'Status Changed', color: 'yellow' },
  task_assigned: { icon: User, label: 'Task Assigned', color: 'purple' },
  task_completed: { icon: CheckCircle, label: 'Task Completed', color: 'green' },
  comment_added: { icon: MessageSquare, label: 'Comment Added', color: 'blue' },
  project_created: { icon: FolderOpen, label: 'Project Created', color: 'green' },
  project_updated: { icon: Settings, label: 'Project Updated', color: 'blue' },
  project_deleted: { icon: Trash, label: 'Project Deleted', color: 'red' },
  agent_joined: { icon: Users, label: 'Agent Joined', color: 'green' },
  agent_status_changed: { icon: User, label: 'Agent Status Changed', color: 'blue' },
  default: { icon: Activity, label: 'Activity', color: 'gray' }
}

const DATE_RANGES = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  all: 'All Time'
}

export function ActivityFeed({
  maxItems = 50,
  showFilters = true,
  compact = false,
  realTime = true,
  className,
  title = 'Activity Feed',
  description = 'Real-time activity across all projects'
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ActivityFilters>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  
  // Available filter options
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([])
  const [agents, setAgents] = useState<Array<{ id: number; name: string; role: string; color: string }>>([])
  
  const { socket, connectionStatus } = useWebSocket()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch activity data
  const fetchActivities = useCallback(async (pageNum = 1, append = false, currentFilters = filters) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: maxItems.toString(),
        ...(currentFilters.project && { project: currentFilters.project }),
        ...(currentFilters.agent && { agent: currentFilters.agent }),
        ...(currentFilters.activityType && { activityType: currentFilters.activityType }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.dateRange?.start && { startDate: currentFilters.dateRange.start }),
        ...(currentFilters.dateRange?.end && { endDate: currentFilters.dateRange.end })
      })

      const response = await fetch(`/api/activity?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        if (append) {
          setActivities(prev => [...prev, ...data.data])
        } else {
          setActivities(data.data)
        }
        setHasMore(data.hasMore)
        setPage(pageNum)
      } else {
        throw new Error(data.error || 'Failed to fetch activities')
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [maxItems, filters])

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [projectsRes, agentsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/agents')
      ])

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        if (projectsData.success) {
          setProjects(projectsData.data)
        }
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        if (agentsData.success) {
          setAgents(agentsData.data)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch filter options:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchActivities(1)
    fetchFilterOptions()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    setPage(1)
    fetchActivities(1, false, filters)
  }, [filters, fetchActivities])

  // Real-time activity updates
  useEffect(() => {
    if (!realTime || !socket) return

    const handleNewActivity = (activity: ActivityItem) => {
      setActivities(prev => [activity, ...prev].slice(0, maxItems))
    }

    socket.on('activity', handleNewActivity)

    return () => {
      // Proper cleanup to handle socket reconnection scenarios
      try {
        socket.off('activity', handleNewActivity)
      } catch (error) {
        // Socket might be in an invalid state during reconnection
        console.warn('Failed to remove activity listener:', error)
      }
    }
  }, [socket, realTime, maxItems])

  // Additional cleanup on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (socket) {
        socket.off('activity')
      }
    }
  }, [])

  // Infinite scroll intersection observer
  useEffect(() => {
    if (!hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchActivities(page + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, page, fetchActivities])

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    fetchActivities(1)
  }

  const handleFilterChange = (key: keyof ActivityFilters, value: string | { start: string; end: string } | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const toggleExpanded = (itemId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const formatActivityDescription = (activity: ActivityItem): string => {
    const agentName = activity.agent?.name || 'Unknown'
    const projectName = activity.project?.name || 'Unknown Project'
    const taskTitle = activity.task?.title || 'Unknown Task'

    switch (activity.action) {
      case 'task_created':
        return `${agentName} created task "${taskTitle}" in ${projectName}`
      case 'task_updated':
        return `${agentName} updated task "${taskTitle}"`
      case 'task_moved':
        const from = activity.details.fromStatus as string
        const to = activity.details.toStatus as string
        return `${agentName} moved "${taskTitle}" from ${from} to ${to}`
      case 'task_assigned':
        const assignedTo = activity.details.assignedTo as string
        return `${agentName} assigned "${taskTitle}" to ${assignedTo}`
      case 'task_completed':
        return `${agentName} completed task "${taskTitle}"`
      case 'comment_added':
        return `${agentName} commented on "${taskTitle}"`
      case 'project_created':
        return `${agentName} created project "${projectName}"`
      case 'project_updated':
        return `${agentName} updated project "${projectName}"`
      case 'agent_joined':
        return `${agentName} joined the system`
      case 'agent_status_changed':
        const status = activity.details.status as string
        return `${agentName} is now ${status}`
      default:
        return `${agentName} performed ${activity.action.replace('_', ' ')}`
    }
  }

  const getActivityIcon = (action: string) => {
    const config = ACTIVITY_TYPES[action as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.default
    return config.icon
  }

  const getActivityColor = (action: string) => {
    const config = ACTIVITY_TYPES[action as keyof typeof ACTIVITY_TYPES] || ACTIVITY_TYPES.default
    return config.color
  }

  const renderFilters = () => {
    if (!showFilters) return null

    return (
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search activities..."
            className="pl-10 bg-slate-800/50 border-slate-600"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Project Filter */}
        <Select value={filters.project || ''} onValueChange={(value) => handleFilterChange('project', value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Agent Filter */}
        <Select value={filters.agent || ''} onValueChange={(value) => handleFilterChange('agent', value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-36 bg-slate-800/50 border-slate-600">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id.toString()}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: agent.color }}
                  />
                  {agent.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Activity Type Filter */}
        <Select value={filters.activityType || ''} onValueChange={(value) => handleFilterChange('activityType', value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-44 bg-slate-800/50 border-slate-600">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(ACTIVITY_TYPES).filter(([key]) => key !== 'default').map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <config.icon className="w-3 h-3" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="bg-slate-800/50 border-slate-600">
              <Calendar className="w-4 h-4 mr-2" />
              {filters.dateRange ? 'Custom Range' : 'All Time'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-slate-800 border-slate-600">
            <div className="space-y-2">
              {Object.entries(DATE_RANGES).map(([key, label]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (key === 'all') {
                      handleFilterChange('dateRange', undefined)
                    } else {
                      // Set appropriate date ranges based on selection
                      const now = new Date()
                      let startDate = new Date()
                      
                      switch (key) {
                        case 'today':
                          startDate.setHours(0, 0, 0, 0)
                          break
                        case 'week':
                          startDate.setDate(now.getDate() - 7)
                          break
                        case 'month':
                          startDate.setMonth(now.getMonth() - 1)
                          break
                        case 'quarter':
                          startDate.setMonth(now.getMonth() - 3)
                          break
                      }
                      
                      handleFilterChange('dateRange', {
                        start: startDate.toISOString(),
                        end: now.toISOString()
                      })
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {Object.keys(filters).length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-slate-400 hover:text-white"
          >
            Clear Filters
          </Button>
        )}
      </div>
    )
  }

  const renderActivityItem = (activity: ActivityItem) => {
    const Icon = getActivityIcon(activity.action)
    const color = getActivityColor(activity.action)
    const isExpanded = expandedItems.has(activity.id)
    
    const colorClasses = {
      green: 'text-green-400 bg-green-400/20',
      blue: 'text-blue-400 bg-blue-400/20',
      red: 'text-red-400 bg-red-400/20',
      yellow: 'text-yellow-400 bg-yellow-400/20',
      purple: 'text-purple-400 bg-purple-400/20',
      gray: 'text-gray-400 bg-gray-400/20'
    }

    const borderColorMap = {
      green: 'border-green-400/50',
      blue: 'border-blue-400/50',
      red: 'border-red-400/50',
      yellow: 'border-yellow-400/50',
      purple: 'border-purple-400/50',
      gray: 'border-gray-400/50'
    }

    return (
      <motion.div
        key={activity.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'border-l-2 pl-4 pb-4 last:pb-0',
          borderColorMap[color as keyof typeof borderColorMap] || borderColorMap.gray
        )}
      >
        <div className="flex items-start gap-3">
          {/* Activity Icon */}
          <div className={cn(
            'p-2 rounded-full shrink-0 mt-0.5',
            colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
          )}>
            <Icon className="w-3 h-3" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">
                  {formatActivityDescription(activity)}
                </p>
                
                {/* Agent info */}
                {activity.agent && (
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: activity.agent.color }}
                    />
                    <span className="text-xs text-slate-400">
                      {activity.agent.name} • {activity.agent.role}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">
                  {compact ? 
                    formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) :
                    format(new Date(activity.timestamp), 'MMM dd, HH:mm')
                  }
                </p>
                
                {/* Expand/Collapse Button */}
                {Object.keys(activity.details).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 mt-1"
                    onClick={() => toggleExpanded(activity.id)}
                  >
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && Object.keys(activity.details).length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <h4 className="text-xs font-medium text-slate-300 mb-2">Activity Details</h4>
                  <div className="space-y-1">
                    {Object.entries(activity.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-slate-400">{key}:</span>
                        <span className="text-slate-300">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <Card className={cn("bg-slate-800/50 backdrop-blur-xl border-slate-700/50", className)}>
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
            Error Loading Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-slate-800/50 backdrop-blur-xl border-slate-700/50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              {title}
              {realTime && connectionStatus === 'connected' && (
                <div className="ml-2 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="ml-1 text-xs text-green-400">Live</span>
                </div>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderFilters()}
        
        <ScrollArea className="h-96" ref={scrollAreaRef}>
          <AnimatePresence>
            {loading && activities.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activity found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map(renderActivityItem)}
                
                {/* Load More Trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="text-center py-4">
                    {loading && (
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading more activities...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}