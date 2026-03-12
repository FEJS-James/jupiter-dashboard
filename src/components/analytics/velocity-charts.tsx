'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { format, parseISO } from 'date-fns'

interface VelocityChartsProps {
  data: {
    chartData: Array<{
      date: string
      created: number
      completed: number
      net: number
      createdMA?: number
      completedMA?: number
    }>
    metrics: {
      totalCreated: number
      totalCompleted: number
      avgDailyCreation: number
      avgDailyCompletion: number
      velocityTrend: number
      period: string
    }
  }
}

export function VelocityCharts({ data }: VelocityChartsProps) {
  const { actualTheme } = useTheme()

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d')
    } catch {
      return dateStr
    }
  }

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
            {formatDate(label)}
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

  const chartColors = {
    created: actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',
    completed: actualTheme === 'dark' ? '#34d399' : '#10b981',
    net: actualTheme === 'dark' ? '#f472b6' : '#ec4899',
    createdMA: actualTheme === 'dark' ? '#93c5fd' : '#1d4ed8',
    completedMA: actualTheme === 'dark' ? '#6ee7b7' : '#047857'
  }

  return (
    <div className="space-y-6">
      {/* Velocity Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              Total Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.metrics.totalCreated}
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
              Total Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.metrics.totalCompleted}
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
              Daily Creation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.metrics.avgDailyCreation}
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
              Daily Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.metrics.avgDailyCompletion}
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
              Velocity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {data.metrics.velocityTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                'text-2xl font-bold',
                data.metrics.velocityTrend >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {data.metrics.velocityTrend > 0 ? '+' : ''}{data.metrics.velocityTrend}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Creation vs Completion Line Chart */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Task Velocity Over Time
          </CardTitle>
          <p className={cn(
            'text-sm',
            actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Daily task creation and completion rates with 7-day moving average
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke={chartColors.created} 
                  name="Tasks Created" 
                  strokeWidth={2}
                  dot={{ fill: chartColors.created, strokeWidth: 2, r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke={chartColors.completed} 
                  name="Tasks Completed" 
                  strokeWidth={2}
                  dot={{ fill: chartColors.completed, strokeWidth: 2, r: 3 }}
                />
                {data.chartData.some(d => d.createdMA !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="createdMA" 
                    stroke={chartColors.createdMA} 
                    name="Created (7-day avg)" 
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                )}
                {data.chartData.some(d => d.completedMA !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="completedMA" 
                    stroke={chartColors.completedMA} 
                    name="Completed (7-day avg)" 
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Net Velocity Chart */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Net Velocity (Created - Completed)
          </CardTitle>
          <p className={cn(
            'text-sm',
            actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Positive values indicate backlog growth, negative values indicate backlog reduction
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="net" 
                  fill={chartColors.net}
                  name="Net Tasks"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}