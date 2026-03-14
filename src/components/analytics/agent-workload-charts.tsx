'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { Users, TrendingUp, Activity, Clock, AlertCircle } from 'lucide-react'

interface AgentWorkloadChartsProps {
  data: {
    workloadDistribution: Array<{
      agentName: string
      role: string
      color: string
      status: string
      totalTasks: number
      completedTasks: number
      inProgressTasks: number
      completionRate: number
    }>
    productivityMetrics: Array<{
      agentName: string
      role: string
      tasksCompleted: number
      avgCompletionTime: number
    }>
    workloadBalance: {
      agents: Array<{
        agentName: string
        totalTasks: number
        workloadRatio: number
        isOverloaded: boolean
        isUnderloaded: boolean
      }>
      avgTasksPerAgent: number
      totalTasks: number
      overloadedAgents: number
      underloadedAgents: number
    }
    agentCapacity: Array<{
      agentName: string
      role: string
      status: string
      currentTaskTitle?: string
      totalAssigned: number
      isAvailable: boolean
      capacity: string
    }>
    peakActivity: {
      hourlyData: Array<{
        hour: string
        activityCount: number
        activeAgents: number
      }>
      peakTime?: {
        hour: string
        activityCount: number
      }
      peakHour?: {
        hour: string
        activityCount: number
      }
    }
    taskSwitching: Array<{
      agentName: string
      switches: number
    }>
  }
}

export function AgentWorkloadCharts({ data }: AgentWorkloadChartsProps) {
  const { actualTheme } = useTheme()

  // Safe array accessors for API data
  const workloadDistribution = Array.isArray(data?.workloadDistribution) ? data.workloadDistribution : []
  const productivityMetrics = Array.isArray(data?.productivityMetrics) ? data.productivityMetrics : []
  const workloadBalance = data?.workloadBalance || { agents: [], avgTasksPerAgent: 0, totalTasks: 0, overloadedAgents: 0, underloadedAgents: 0 }
  const workloadBalanceAgents = Array.isArray(workloadBalance.agents) ? workloadBalance.agents : []
  const agentCapacity = Array.isArray(data?.agentCapacity) ? data.agentCapacity : []
  const peakActivity = data?.peakActivity || { hourlyData: [], peakTime: undefined, peakHour: undefined }
  const hourlyData = Array.isArray(peakActivity.hourlyData) ? peakActivity.hourlyData : []
  const taskSwitching = Array.isArray(data?.taskSwitching) ? data.taskSwitching : []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn(
          'p-3 rounded-lg border shadow-lg',
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

  const roleColors = {
    'coder': actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    'reviewer': actualTheme === 'dark' ? '#34d399' : '#10b981',
    'devops': actualTheme === 'dark' ? '#f87171' : '#ef4444',
    'manager': actualTheme === 'dark' ? '#a78bfa' : '#8b5cf6',
    'tester': actualTheme === 'dark' ? '#fbbf24' : '#f59e0b'
  }

  // Normalize: API may return peakHour or peakTime
  const peakTimeData = peakActivity.peakTime || peakActivity.peakHour || { hour: 'N/A', activityCount: 0 }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-500'
      case 'busy': return 'text-yellow-500'
      case 'offline': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default'
      case 'busy': return 'secondary'
      case 'offline': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Agent Workload Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium',
              actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            )}>
              Total Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {workloadDistribution.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium',
              actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            )}>
              Avg Tasks per Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {workloadBalance.avgTasksPerAgent}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium',
              actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            )}>
              Overloaded Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className={cn(
                'text-2xl font-bold text-red-500'
              )}>
                {workloadBalance.overloadedAgents}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className={cn(
              'text-sm font-medium',
              actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            )}>
              Peak Activity Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className={cn(
                'text-xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {peakTimeData.hour}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks per Agent Bar Chart */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Task Distribution by Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadDistribution}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="agentName" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="totalTasks" fill={actualTheme === 'dark' ? '#475569' : '#e2e8f0'} name="Total Tasks" />
                <Bar dataKey="completedTasks" fill={actualTheme === 'dark' ? '#34d399' : '#10b981'} name="Completed" />
                <Bar dataKey="inProgressTasks" fill={actualTheme === 'dark' ? '#fbbf24' : '#f59e0b'} name="In Progress" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Productivity Metrics */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Productivity Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productivityMetrics} layout="horizontal">
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis type="number" stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis 
                    type="category" 
                    dataKey="agentName" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tasksCompleted" fill={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'} name="Tasks Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Workload Balance */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Workload Balance Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadBalanceAgents}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis 
                    dataKey="agentName" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  />
                  <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="workloadRatio" 
                    fill={actualTheme === 'dark' ? '#a78bfa' : '#8b5cf6'} 
                    name="Workload Ratio"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Activity Hours */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Agent Activity Throughout the Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="hour" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="activityCount" 
                  stroke={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'}
                  fill={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'}
                  fillOpacity={0.3}
                  name="Activity Count"
                />
                <Line 
                  type="monotone" 
                  dataKey="activeAgents" 
                  stroke={actualTheme === 'dark' ? '#34d399' : '#10b981'}
                  name="Active Agents"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Agent Capacity Overview */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Agent Capacity & Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentCapacity.map((agent, index) => (
              <div key={agent.agentName} className={cn(
                'flex items-center justify-between p-4 rounded-lg',
                actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
              )}>
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: workloadDistribution.find(w => w.agentName === agent.agentName)?.color || '#gray' }}
                  />
                  <div>
                    <h4 className={cn(
                      'font-medium',
                      actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {agent.agentName}
                    </h4>
                    <p className={cn(
                      'text-sm',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      {agent.role} • {agent.totalAssigned} tasks assigned
                    </p>
                    {agent.currentTaskTitle && (
                      <p className={cn(
                        'text-xs truncate max-w-xs',
                        actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                      )}>
                        Current: {agent.currentTaskTitle}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadgeVariant(agent.status)}>
                    {agent.status}
                  </Badge>
                  <Badge variant="outline">
                    {agent.capacity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Switching Analysis */}
      {taskSwitching.length > 0 && (
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Task Switching Frequency
            </CardTitle>
            <p className={cn(
              'text-sm',
              actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              How often agents switch between tasks (lower is generally better for focus)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskSwitching}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis 
                    dataKey="agentName" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  />
                  <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="switches" 
                    fill={actualTheme === 'dark' ? '#f87171' : '#ef4444'} 
                    name="Task Switches"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}