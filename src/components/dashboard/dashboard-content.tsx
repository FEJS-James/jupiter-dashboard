'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  GitBranch,
  Activity,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  WifiOff
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalAgents: number
  activeAgents: number
}

interface ProjectWithTasks {
  id: number
  name: string
  status: string
  taskCount: number
  completedTasks: number
}

interface TaskWithDetails {
  id: number
  title: string
  status: string
  priority: string
  createdAt: string
  project: { name: string } | null
  agent: { name: string; role: string; color: string } | null
}

interface Agent {
  id: number
  name: string
  role: string
  status: string
  color: string
}

interface ErrorState {
  hasError: boolean
  message: string
  type: 'network' | 'server' | 'unknown'
  retryable: boolean
}

const statusColors = {
  'backlog': '#64748b',
  'in-progress': '#3b82f6',
  'code-review': '#f59e0b',
  'testing': '#8b5cf6',
  'deploying': '#06b6d4',
  'done': '#10b981',
  'blocked': '#ef4444',
}

const statusLabels = {
  'backlog': 'Backlog',
  'in-progress': 'In Progress',
  'code-review': 'Code Review',
  'testing': 'Testing',
  'deploying': 'Deploying',
  'done': 'Done',
  'blocked': 'Blocked',
}

const priorityColors = {
  'low': '#64748b',
  'medium': '#3b82f6',
  'high': '#f59e0b',
  'urgent': '#ef4444',
}

const priorityLabels = {
  'low': 'Low Priority',
  'medium': 'Medium Priority',
  'high': 'High Priority',
  'urgent': 'Urgent',
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<ProjectWithTasks[]>([])
  const [recentTasks, setRecentTasks] = useState<TaskWithDetails[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '', type: 'unknown', retryable: true })
  const [retryCount, setRetryCount] = useState(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)

  // Focus management for dynamic content
  const errorRef = useRef<HTMLDivElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const determineErrorType = (error: any): ErrorState['type'] => {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'network'
    }
    if (error.status >= 500) {
      return 'server'
    }
    return 'unknown'
  }

  const createErrorState = (error: any): ErrorState => {
    const type = determineErrorType(error)
    let message = 'An unexpected error occurred while loading dashboard data.'
    let retryable = true

    switch (type) {
      case 'network':
        message = 'Unable to connect to the server. Please check your internet connection.'
        break
      case 'server':
        message = 'The server is experiencing issues. Please try again in a few moments.'
        break
      case 'unknown':
        if (error.status === 404) {
          message = 'Dashboard data not found. This might be a configuration issue.'
          retryable = false
        } else if (error.status === 403) {
          message = 'You do not have permission to access this dashboard.'
          retryable = false
        }
        break
    }

    return { hasError: true, message, type, retryable }
  }

  const fetchDashboardData = useCallback(async (isRetry = false) => {
    try {
      setError({ hasError: false, message: '', type: 'unknown', retryable: true })
      if (!isRetry) {
        setLoading(true)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const [projectsRes, tasksRes, agentsRes] = await Promise.all([
        fetch('/api/projects', { signal: controller.signal }),
        fetch('/api/tasks?limit=10', { signal: controller.signal }),
        fetch('/api/agents', { signal: controller.signal })
      ])

      clearTimeout(timeoutId)

      // Check if any request failed
      if (!projectsRes.ok) throw new Error(`Projects API failed: ${projectsRes.status}`)
      if (!tasksRes.ok) throw new Error(`Tasks API failed: ${tasksRes.status}`)
      if (!agentsRes.ok) throw new Error(`Agents API failed: ${agentsRes.status}`)

      const projectsData = await projectsRes.json()
      const tasksData = await tasksRes.json()
      const agentsData = await agentsRes.json()

      if (projectsData.success && tasksData.success && agentsData.success) {
        const allProjects = projectsData.data
        const allTasks = tasksData.data
        const allAgents = agentsData.data

        // Calculate stats
        const dashboardStats: DashboardStats = {
          totalProjects: allProjects.length,
          activeProjects: allProjects.filter((p: any) => p.status === 'active').length,
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter((t: any) => t.status === 'done').length,
          totalAgents: allAgents.length,
          activeAgents: allAgents.filter((a: any) => a.status === 'available' || a.status === 'busy').length,
        }

        // Project stats with task counts
        const projectStats = allProjects.map((project: any) => {
          const projectTasks = allTasks.filter((task: any) => task.projectId === project.id)
          return {
            ...project,
            taskCount: projectTasks.length,
            completedTasks: projectTasks.filter((t: any) => t.status === 'done').length,
          }
        })

        setStats(dashboardStats)
        setProjects(projectStats.slice(0, 6)) // Top 6 projects
        setRecentTasks(allTasks.slice(0, 8)) // Most recent 8 tasks
        setAgents(allAgents)
        setRetryCount(0)
        lastFetchTimeRef.current = Date.now()

        // Focus management - announce success to screen readers
        if (isRetry && mainContentRef.current) {
          mainContentRef.current.focus()
        }
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error: any) {
      console.error('Dashboard data fetch failed:', error)
      const errorState = createErrorState(error)
      setError(errorState)
      
      // Focus on error message for screen readers
      setTimeout(() => {
        if (errorRef.current) {
          errorRef.current.focus()
        }
      }, 100)

      // Auto-retry for retryable errors (with exponential backoff)
      if (errorState.retryable && retryCount < 3) {
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchDashboardData(true)
        }, backoffDelay)
      }
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  useEffect(() => {
    fetchDashboardData()
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [fetchDashboardData])

  const handleManualRetry = () => {
    setRetryCount(0)
    fetchDashboardData()
  }

  // Prepare chart data with fallbacks
  const taskStatusData = recentTasks.length > 0 ? recentTasks.reduce((acc, task) => {
    const existing = acc.find(item => item.status === task.status)
    if (existing) {
      existing.count++
    } else {
      acc.push({ 
        status: task.status, 
        count: 1, 
        color: statusColors[task.status as keyof typeof statusColors],
        label: statusLabels[task.status as keyof typeof statusLabels] || task.status
      })
    }
    return acc
  }, [] as Array<{ status: string; count: number; color: string; label: string }>) : []

  const agentWorkloadData = agents.length > 0 ? agents.map(agent => ({
    name: agent.name,
    role: agent.role,
    tasks: recentTasks.filter(task => task.agent?.name === agent.name).length,
    status: agent.status,
    color: agent.color,
  })) : []

  // Error state UI
  if (error.hasError) {
    return (
      <div className="p-6 space-y-8">
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white" id="dashboard-title">
            Dashboard Error
          </h1>
          <p className="text-lg text-slate-400">
            We encountered an issue loading your dashboard.
          </p>
        </motion.div>

        <Alert className="bg-red-900/20 border-red-500/20" ref={errorRef} tabIndex={-1}>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-red-200">
            <div className="flex items-center gap-2 mb-3">
              {error.type === 'network' && <WifiOff className="h-4 w-4" aria-hidden="true" />}
              <span>{error.message}</span>
            </div>
            {error.retryable && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualRetry} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                  aria-describedby="retry-description"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                      Try Again
                    </>
                  )}
                </Button>
                <span id="retry-description" className="text-sm text-slate-400 flex items-center">
                  {retryCount > 0 && `Attempt ${retryCount + 1} of 4`}
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Fallback content when data is partially available */}
        {(projects.length > 0 || recentTasks.length > 0 || agents.length > 0) && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Previously Loaded Data</h2>
            <p className="text-slate-400 text-sm mb-6">
              Showing cached data from {formatDistanceToNow(lastFetchTimeRef.current)} ago.
            </p>
            {/* Render partial dashboard content here if needed */}
          </div>
        )}
      </div>
    )
  }

  // Loading state UI
  if (loading) {
    return (
      <div className="p-6 space-y-8" role="main" aria-busy="true" aria-label="Loading dashboard">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <span className="sr-only" aria-live="polite">Loading dashboard data...</span>
      </div>
    )
  }

  return (
    <main className="p-6 space-y-8" ref={mainContentRef} tabIndex={-1} role="main" aria-labelledby="main-heading">
      {/* Welcome Header */}
      <motion.header 
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 id="main-heading" className="text-3xl font-bold text-white">
          Welcome to AgentFlow
        </h1>
        <p className="text-lg text-slate-400">
          Your autonomous development pipeline is ready for action.
        </p>
      </motion.header>

      {/* Quick Actions */}
      <motion.nav
        className="flex flex-wrap gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        aria-label="Quick actions"
      >
        <Link href="/projects/new">
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            aria-label="Create new project"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            New Project
          </Button>
        </Link>
        <Link href="/projects">
          <Button 
            variant="outline" 
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
            aria-label="Browse existing projects"
          >
            <FolderOpen className="w-4 h-4 mr-2" aria-hidden="true" />
            Browse Projects
          </Button>
        </Link>
        <Button 
          variant="outline" 
          className="border-slate-600 text-slate-200 hover:bg-slate-800"
          aria-label="View activity log"
        >
          <Activity className="w-4 h-4 mr-2" aria-hidden="true" />
          View Activity
        </Button>
        <Button 
          variant="outline" 
          className="border-slate-600 text-slate-200 hover:bg-slate-800"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
          Settings
        </Button>
      </motion.nav>

      {/* Stats Cards */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              title: 'Active Projects', 
              value: stats?.activeProjects || 0,
              total: stats?.totalProjects || 0,
              icon: FolderOpen,
              color: 'blue',
              change: '+12%',
              description: 'Projects currently in development'
            },
            { 
              title: 'Available Agents', 
              value: stats?.activeAgents || 0,
              total: stats?.totalAgents || 0,
              icon: Users,
              color: 'green',
              change: '+5%',
              description: 'Agents ready to work on tasks'
            },
            { 
              title: 'Completed Tasks', 
              value: stats?.completedTasks || 0,
              total: stats?.totalTasks || 0,
              icon: CheckCircle2,
              color: 'purple',
              change: '+18%',
              description: 'Tasks finished and deployed'
            },
            { 
              title: 'Active Tasks', 
              value: (stats?.totalTasks || 0) - (stats?.completedTasks || 0),
              total: stats?.totalTasks || 0,
              icon: Clock,
              color: 'yellow',
              change: '+8%',
              description: 'Tasks currently being worked on'
            },
          ].map((card, index) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-400">{card.title}</p>
                        <p 
                          className="text-2xl font-bold text-white"
                          aria-label={`${card.value} ${card.title.toLowerCase()}${card.total > 0 ? ` out of ${card.total} total` : ''}`}
                        >
                          {card.value}
                          {card.total > 0 && (
                            <span className="text-sm font-normal text-slate-400 ml-1">
                              / {card.total}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-green-400 mt-1" aria-label={`${card.change} change from last week`}>
                          {card.change} from last week
                        </p>
                      </div>
                      <div 
                        className={`h-12 w-12 rounded-lg bg-${card.color}-500/20 flex items-center justify-center`}
                        aria-label={card.description}
                      >
                        <Icon className={`h-6 w-6 text-${card.color}-500`} aria-hidden="true" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Charts Section */}
      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">Dashboard Charts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Status Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center" id="task-status-chart">
                  <BarChart3 className="w-5 h-5 mr-2" aria-hidden="true" />
                  Task Status Distribution
                </CardTitle>
                <CardDescription>Current task distribution across statuses</CardDescription>
              </CardHeader>
              <CardContent>
                {taskStatusData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart role="img" aria-labelledby="task-status-chart" aria-describedby="task-status-description">
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {taskStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [`${value} tasks`, statusLabels[name as keyof typeof statusLabels] || name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div id="task-status-description" className="sr-only">
                      Task status distribution: {taskStatusData.map(item => 
                        `${item.count} ${item.label}`
                      ).join(', ')}
                    </div>
                    {/* Text alternative for charts */}
                    <div className="mt-4 space-y-2" aria-label="Task status breakdown">
                      {taskStatusData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                            <span className="text-slate-300">{item.label}</span>
                          </div>
                          <span className="text-slate-400 font-medium">{item.count} tasks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400" role="img" aria-label="No task data available">
                    No tasks to display
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Agent Workload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center" id="agent-workload-chart">
                  <TrendingUp className="w-5 h-5 mr-2" aria-hidden="true" />
                  Agent Workload
                </CardTitle>
                <CardDescription>Task distribution across agents</CardDescription>
              </CardHeader>
              <CardContent>
                {agentWorkloadData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={agentWorkloadData} role="img" aria-labelledby="agent-workload-chart" aria-describedby="agent-workload-description">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b"
                          fontSize={12}
                        />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value, name) => [`${value} tasks`, 'Tasks assigned']}
                        />
                        <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div id="agent-workload-description" className="sr-only">
                      Agent workload distribution: {agentWorkloadData.map(agent => 
                        `${agent.name} has ${agent.tasks} tasks`
                      ).join(', ')}
                    </div>
                    {/* Text alternative for charts */}
                    <div className="mt-4 space-y-2" aria-label="Agent workload breakdown">
                      {agentWorkloadData.map((agent, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: agent.color }}
                              aria-hidden="true"
                            />
                            <span className="text-slate-300">{agent.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {agent.role}
                            </Badge>
                          </div>
                          <span className="text-slate-400 font-medium">{agent.tasks} tasks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400" role="img" aria-label="No agent data available">
                    No agent data to display
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Recent Activity & Project Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center" id="recent-tasks-heading">
                <Clock className="w-5 h-5 mr-2" aria-hidden="true" />
                Recent Tasks
              </CardTitle>
              <CardDescription>Latest task updates across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <section aria-labelledby="recent-tasks-heading">
                <div className="space-y-3" role="list">
                  {recentTasks.length > 0 ? recentTasks.map((task, index) => (
                    <motion.div 
                      key={task.id} 
                      className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-b-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                      role="listitem"
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: statusColors[task.status as keyof typeof statusColors] }}
                          aria-hidden="true"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white truncate max-w-48">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-400">
                              {task.project?.name || 'No project'}
                            </p>
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-1.5 py-0.5"
                              style={{ 
                                backgroundColor: `${priorityColors[task.priority as keyof typeof priorityColors]}20`,
                                color: priorityColors[task.priority as keyof typeof priorityColors]
                              }}
                              aria-label={`Priority: ${priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className="text-xs mb-1"
                          style={{ 
                            borderColor: statusColors[task.status as keyof typeof statusColors],
                            color: statusColors[task.status as keyof typeof statusColors]
                          }}
                          aria-label={`Status: ${statusLabels[task.status as keyof typeof statusLabels] || task.status}`}
                        >
                          {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="text-center py-8 text-slate-400" role="status">
                      No tasks found
                    </div>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>
        </motion.div>

        {/* Project Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center" id="active-projects-heading">
                <GitBranch className="w-5 h-5 mr-2" aria-hidden="true" />
                Active Projects
              </CardTitle>
              <CardDescription>Project progress and completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <section aria-labelledby="active-projects-heading">
                <div className="space-y-4" role="list">
                  {projects.length > 0 ? projects.map((project, index) => {
                    const completionRate = project.taskCount > 0 
                      ? (project.completedTasks / project.taskCount) * 100 
                      : 0

                    return (
                      <motion.div
                        key={project.id}
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                        role="listitem"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white">{project.name}</h3>
                            <Badge 
                              variant={project.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                              aria-label={`Project status: ${project.status}`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-400" aria-label={`${project.completedTasks} completed out of ${project.taskCount} total tasks`}>
                            {project.completedTasks}/{project.taskCount} tasks
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2" role="progressbar" aria-valuenow={completionRate} aria-valuemin={0} aria-valuemax={100} aria-label={`Project ${project.name} completion progress`}>
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">
                          {completionRate.toFixed(0)}% complete
                        </p>
                      </motion.div>
                    )
                  }) : (
                    <div className="text-center py-8 text-slate-400" role="status">
                      No projects found
                    </div>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}