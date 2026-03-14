'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { FolderOpen, TrendingUp, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ProjectPerformanceChartsProps {
  data: {
    projectProgress: Array<{
      projectId: number
      projectName: string
      status: string
      totalTasks: number
      completedTasks: number
      inProgressTasks: number
      blockedTasks: number
      completionRate: number
      createdAt: string
      updatedAt: string
    }>
    projectVelocity: Array<{
      projectId: number
      projectName: string
      tasksCompletedLast30Days: number
      avgTasksPerWeek: number
      velocity: string
    }>
    taskBreakdown: Array<{
      projectId: number
      projectName: string
      byPriority: {
        low: number
        medium: number
        high: number
        urgent: number
      }
      byStatus: {
        backlog: number
        'in-progress': number
        'code-review': number
        testing: number
        deploying: number
        done: number
        blocked: number
      }
    }>
    projectTimelines: Array<{
      projectId: number
      projectName: string
      status: string
      startDate?: string | number
      endDate?: string | number
      durationDays: number
      nextDueDate?: string | number
      overdueTasks: number
      isOverdue: boolean
    }>
    resourceAllocation: Array<{
      agentName: string
      projects: Array<{
        projectId: number
        projectName: string
        taskCount: number
      }>
      totalTasks: number
      projectCount: number
      isMultiProject: boolean
    }>
    projectHealth: Array<{
      projectId: number
      projectName: string
      healthScore: number
      healthStatus: string
    }>
  }
}

export function ProjectPerformanceCharts({ data }: ProjectPerformanceChartsProps) {
  const { actualTheme } = useTheme()

  // Safe array accessors for API data
  const projectProgress = Array.isArray(data?.projectProgress) ? data.projectProgress : []
  const projectVelocity = Array.isArray(data?.projectVelocity) ? data.projectVelocity : []
  const taskBreakdown = Array.isArray(data?.taskBreakdown) ? data.taskBreakdown : []
  const projectTimelines = Array.isArray(data?.projectTimelines) ? data.projectTimelines : []
  const resourceAllocation = Array.isArray(data?.resourceAllocation) ? data.resourceAllocation : []
  const projectHealth = Array.isArray(data?.projectHealth) ? data.projectHealth : []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn(
          'p-3 rounded-lg border shadow-lg max-w-xs',
          actualTheme === 'dark' 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        )}>
          <p className={cn(
            'font-medium mb-2',
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'text-green-500'
      case 'Good': return 'text-blue-500'
      case 'Warning': return 'text-yellow-500'
      case 'Critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'Excellent': return 'default'
      case 'Good': return 'secondary'
      case 'Warning': return 'outline'
      case 'Critical': return 'destructive'
      default: return 'outline'
    }
  }

  const statusColors = [
    actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',  // backlog
    actualTheme === 'dark' ? '#fbbf24' : '#f59e0b',  // in-progress
    actualTheme === 'dark' ? '#a78bfa' : '#8b5cf6',  // code-review
    actualTheme === 'dark' ? '#fb7185' : '#ec4899',  // testing
    actualTheme === 'dark' ? '#f87171' : '#ef4444',  // deploying
    actualTheme === 'dark' ? '#34d399' : '#10b981',  // done
    actualTheme === 'dark' ? '#6b7280' : '#9ca3af'   // blocked
  ]

  const priorityColors = [
    actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',  // low
    actualTheme === 'dark' ? '#fbbf24' : '#f59e0b',  // medium
    actualTheme === 'dark' ? '#f87171' : '#ef4444',  // high
    actualTheme === 'dark' ? '#dc2626' : '#b91c1c'   // urgent
  ]

  return (
    <div className="space-y-6">
      {/* Project Health Overview */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Project Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectHealth.map((project) => (
              <Card key={project.projectId} className={cn(
                'p-4',
                actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={cn(
                    'font-medium truncate',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {project.projectName}
                  </h4>
                  <Badge variant={getHealthBadgeVariant(project.healthStatus)}>
                    {project.healthStatus}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn(
                      actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    )}>
                      Health Score
                    </span>
                    <span className={cn(
                      'font-medium',
                      getHealthColor(project.healthStatus)
                    )}>
                      {project.healthScore}/100
                    </span>
                  </div>
                  <Progress value={project.healthScore} className="h-2" />
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Progress */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Project Progress Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgress}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="projectName" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="totalTasks" fill={actualTheme === 'dark' ? '#475569' : '#e2e8f0'} name="Total Tasks" />
                <Bar dataKey="completedTasks" fill={actualTheme === 'dark' ? '#34d399' : '#10b981'} name="Completed" />
                <Bar dataKey="inProgressTasks" fill={actualTheme === 'dark' ? '#fbbf24' : '#f59e0b'} name="In Progress" />
                <Bar dataKey="blockedTasks" fill={actualTheme === 'dark' ? '#f87171' : '#ef4444'} name="Blocked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Velocity Comparison */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Project Velocity (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectVelocity} layout="horizontal">
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis type="number" stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis 
                    type="category" 
                    dataKey="projectName" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tasksCompletedLast30Days" fill={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'} name="Tasks Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Completion Rates */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Completion Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectProgress.map((project) => (
                <div key={project.projectId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {project.projectName}
                    </span>
                    <span className={cn(
                      'text-sm',
                      actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                    )}>
                      {project.completionRate}%
                    </span>
                  </div>
                  <Progress value={project.completionRate} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn(
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    )}>
                      {project.completedTasks}/{project.totalTasks} tasks
                    </span>
                    {project.blockedTasks > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {project.blockedTasks} blocked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Breakdown by Project */}
      {taskBreakdown.length > 0 && (
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Task Breakdown by Status and Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {taskBreakdown.slice(0, 4).map((project) => (
                <div key={project.projectId} className="space-y-4">
                  <h4 className={cn(
                    'font-medium',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {project.projectName}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status breakdown */}
                    <div>
                      <h5 className={cn(
                        'text-sm font-medium mb-2',
                        actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      )}>
                        By Status
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(project.byStatus).map(([status, count], index) => (
                          count > 0 && (
                            <div key={status} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: statusColors[index % statusColors.length] }}
                                />
                                <span className={cn(
                                  'text-xs capitalize',
                                  actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                                )}>
                                  {status.replace('-', ' ')}
                                </span>
                              </div>
                              <span className={cn(
                                'text-xs',
                                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                              )}>
                                {count}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>

                    {/* Priority breakdown */}
                    <div>
                      <h5 className={cn(
                        'text-sm font-medium mb-2',
                        actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                      )}>
                        By Priority
                      </h5>
                      <div className="space-y-1">
                        {Object.entries(project.byPriority).map(([priority, count], index) => (
                          count > 0 && (
                            <div key={priority} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: priorityColors[index % priorityColors.length] }}
                                />
                                <span className={cn(
                                  'text-xs capitalize',
                                  actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                                )}>
                                  {priority}
                                </span>
                              </div>
                              <span className={cn(
                                'text-xs',
                                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                              )}>
                                {count}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Timelines */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Project Timelines & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectTimelines.map((project) => (
              <div key={project.projectId} className={cn(
                'p-4 rounded-lg',
                actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={cn(
                    'font-medium',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {project.projectName}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {project.status}
                    </Badge>
                    {project.isOverdue && (
                      <Badge variant="destructive">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className={cn(
                      'block',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      Duration
                    </span>
                    <span className={cn(
                      actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {project.durationDays} days
                    </span>
                  </div>
                  {project.startDate && (
                    <div>
                      <span className={cn(
                        'block',
                        actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      )}>
                        Started
                      </span>
                      <span className={cn(
                        actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                      )}>
                        {format(typeof project.startDate === 'number' ? new Date(project.startDate * 1000) : parseISO(project.startDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {project.nextDueDate && (
                    <div>
                      <span className={cn(
                        'block',
                        actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      )}>
                        Next Due
                      </span>
                      <span className={cn(
                        actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                      )}>
                        {format(typeof project.nextDueDate === 'number' ? new Date(project.nextDueDate * 1000) : parseISO(project.nextDueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className={cn(
                      'block',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      Overdue Tasks
                    </span>
                    <span className={cn(
                      project.overdueTasks > 0 ? 'text-red-500' : (actualTheme === 'dark' ? 'text-white' : 'text-slate-900')
                    )}>
                      {project.overdueTasks}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Project Resource Allocation */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Cross-Project Resource Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resourceAllocation.map((agent) => (
              <div key={agent.agentName} className={cn(
                'p-4 rounded-lg',
                actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
              )}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={cn(
                    'font-medium',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {agent.agentName}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {agent.totalTasks} tasks
                    </Badge>
                    <Badge variant={agent.isMultiProject ? 'secondary' : 'default'}>
                      {agent.projectCount} projects
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {agent.projects.map((project) => (
                    <div key={project.projectId} className={cn(
                      'p-2 rounded',
                      actualTheme === 'dark' ? 'bg-slate-600/50' : 'bg-white/50'
                    )}>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-sm truncate',
                          actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                        )}>
                          {project.projectName}
                        </span>
                        <span className={cn(
                          'text-xs',
                          actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          {project.taskCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}