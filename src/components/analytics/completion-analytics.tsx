'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { AlertTriangle, Clock, CheckCircle, Target } from 'lucide-react'

interface CompletionAnalyticsProps {
  data: {
    completionByPriority: Array<{
      priority: string
      total: number
      completed: number
      rate: number
    }>
    completionByProject: Array<{
      projectName: string
      total: number
      completed: number
      rate: number
    }>
    statusDistribution: Array<{
      status: string
      count: number
      percentage: number
    }>
    completionTimeHistogram: Array<{
      range: string
      count: number
    }>
    stuckTasks: Array<{
      taskId: number
      title: string
      status: string
      daysStuck: number
    }>
  }
}

export function CompletionAnalytics({ data }: CompletionAnalyticsProps) {
  const { actualTheme } = useTheme()

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
              {entry.name}: {entry.value}{entry.name.includes('Rate') ? '%' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className={cn(
          'p-3 rounded-lg border shadow-lg',
          actualTheme === 'dark' 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-white border-slate-200'
        )}>
          <p className={cn(
            'font-medium',
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            {data.name}: {data.value} ({data.payload.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const priorityColors = {
    'Low': actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    'Medium': actualTheme === 'dark' ? '#fbbf24' : '#f59e0b', 
    'High': actualTheme === 'dark' ? '#f87171' : '#ef4444',
    'Urgent': actualTheme === 'dark' ? '#dc2626' : '#b91c1c'
  }

  const statusColors = [
    actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    actualTheme === 'dark' ? '#fbbf24' : '#f59e0b',
    actualTheme === 'dark' ? '#34d399' : '#10b981',
    actualTheme === 'dark' ? '#f87171' : '#ef4444',
    actualTheme === 'dark' ? '#a78bfa' : '#8b5cf6',
    actualTheme === 'dark' ? '#fb7185' : '#ec4899',
    actualTheme === 'dark' ? '#6b7280' : '#9ca3af'
  ]

  return (
    <div className="space-y-6">
      {/* Completion Rate Summary */}
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
              Overall Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.completionByPriority.length > 0 ? 
                  Math.round(data.completionByPriority.reduce((sum, p) => sum + p.rate, 0) / data.completionByPriority.length) : 0
                }%
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
              Stuck Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className={cn(
                'text-2xl font-bold text-red-500'
              )}>
                {data.stuckTasks.length}
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
              Avg Time Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className={cn(
                'text-lg font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.completionTimeHistogram.find(h => h.count > 0)?.range || '1-3 days'}
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
              Best Project Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className={cn(
                'text-lg font-bold text-green-500'
              )}>
                {data.completionByProject.length > 0 ? Math.max(...data.completionByProject.map(p => p.rate)) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate by Priority */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Completion Rate by Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.completionByPriority}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="priority" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill={actualTheme === 'dark' ? '#475569' : '#e2e8f0'} name="Total Tasks" />
                <Bar dataKey="completed" fill={actualTheme === 'dark' ? '#34d399' : '#10b981'} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${((entry.value / data.statusDistribution.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Completion Time Histogram */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Time to Completion Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.completionTimeHistogram}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis 
                    dataKey="range" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'} name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
            Completion Rate by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.completionByProject} layout="horizontal">
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis type="number" stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <YAxis 
                  type="category" 
                  dataKey="projectName" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  width={150}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" fill={actualTheme === 'dark' ? '#34d399' : '#10b981'} name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stuck Tasks Table */}
      {data.stuckTasks.length > 0 && (
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              'flex items-center space-x-2',
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Tasks Stuck Too Long</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.stuckTasks.slice(0, 10).map((task) => (
                <div key={task.taskId} className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                )}>
                  <div className="flex-1">
                    <h4 className={cn(
                      'font-medium truncate',
                      actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace('-', ' ')}
                      </Badge>
                      <span className={cn(
                        'text-xs',
                        actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      )}>
                        ID: {task.taskId}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={task.daysStuck > 14 ? 'destructive' : task.daysStuck > 7 ? 'secondary' : 'default'}>
                      {task.daysStuck} days
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}