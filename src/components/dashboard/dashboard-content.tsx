'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  FolderOpen
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

const statusColors = {
  'backlog': '#64748b',
  'in-progress': '#3b82f6',
  'code-review': '#f59e0b',
  'testing': '#8b5cf6',
  'deploying': '#06b6d4',
  'done': '#10b981',
  'blocked': '#ef4444',
}

const priorityColors = {
  'low': '#64748b',
  'medium': '#3b82f6',
  'high': '#f59e0b',
  'urgent': '#ef4444',
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<ProjectWithTasks[]>([])
  const [recentTasks, setRecentTasks] = useState<TaskWithDetails[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [projectsRes, tasksRes, agentsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/tasks?limit=10'),
        fetch('/api/agents')
      ])

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
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data
  const taskStatusData = recentTasks.reduce((acc, task) => {
    const existing = acc.find(item => item.status === task.status)
    if (existing) {
      existing.count++
    } else {
      acc.push({ status: task.status, count: 1, color: statusColors[task.status as keyof typeof statusColors] })
    }
    return acc
  }, [] as Array<{ status: string; count: number; color: string }>)

  const agentWorkloadData = agents.map(agent => ({
    name: agent.name,
    role: agent.role,
    tasks: recentTasks.filter(task => task.agent?.name === agent.name).length,
    status: agent.status,
    color: agent.color,
  }))

  if (loading) {
    return (
      <div className="p-6 space-y-8">
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
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white">
          Welcome to AgentFlow
        </h1>
        <p className="text-lg text-slate-400">
          Your autonomous development pipeline is ready for action.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="flex flex-wrap gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
        <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
          <FolderOpen className="w-4 h-4 mr-2" />
          Browse Projects
        </Button>
        <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
          <Activity className="w-4 h-4 mr-2" />
          View Activity
        </Button>
        <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Active Projects', 
            value: stats?.activeProjects || 0,
            total: stats?.totalProjects || 0,
            icon: FolderOpen,
            color: 'blue',
            change: '+12%'
          },
          { 
            title: 'Available Agents', 
            value: stats?.activeAgents || 0,
            total: stats?.totalAgents || 0,
            icon: Users,
            color: 'green',
            change: '+5%'
          },
          { 
            title: 'Completed Tasks', 
            value: stats?.completedTasks || 0,
            total: stats?.totalTasks || 0,
            icon: CheckCircle2,
            color: 'purple',
            change: '+18%'
          },
          { 
            title: 'Active Tasks', 
            value: (stats?.totalTasks || 0) - (stats?.completedTasks || 0),
            total: stats?.totalTasks || 0,
            icon: Clock,
            color: 'yellow',
            change: '+8%'
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
                      <p className="text-2xl font-bold text-white">
                        {card.value}
                        {card.total > 0 && (
                          <span className="text-sm font-normal text-slate-400 ml-1">
                            / {card.total}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-green-400 mt-1">{card.change} from last week</p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg bg-${card.color}-500/20 flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 text-${card.color}-500`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Task Status Distribution
              </CardTitle>
              <CardDescription>Current task distribution across statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {taskStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
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
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">
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
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Agent Workload
              </CardTitle>
              <CardDescription>Task distribution across agents</CardDescription>
            </CardHeader>
            <CardContent>
              {agentWorkloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agentWorkloadData}>
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
                    />
                    <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  No agent data to display
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
              <CardTitle className="text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Tasks
              </CardTitle>
              <CardDescription>Latest task updates across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTasks.length > 0 ? recentTasks.map((task, index) => (
                  <motion.div 
                    key={task.id} 
                    className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-b-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: statusColors[task.status as keyof typeof statusColors] }}
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
                      >
                        {task.status}
                      </Badge>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                )) : (
                  <div className="text-center py-8 text-slate-400">
                    No tasks found
                  </div>
                )}
              </div>
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
              <CardTitle className="text-white flex items-center">
                <GitBranch className="w-5 h-5 mr-2" />
                Active Projects
              </CardTitle>
              <CardDescription>Project progress and completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{project.name}</h4>
                          <Badge 
                            variant={project.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400">
                          {project.completedTasks}/{project.taskCount} tasks
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
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
                  <div className="text-center py-8 text-slate-400">
                    No projects found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}