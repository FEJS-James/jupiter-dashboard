'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { MessageSquare, TrendingUp, AlertTriangle, Clock, Activity, Zap } from 'lucide-react'

interface AdditionalAnalyticsProps {
  data: {
    priorityDistribution: Array<{
      priority: string
      count: number
      percentage: number
    }>
    commentEngagement: Array<{
      agentName: string
      role: string
      commentCount: number
      avgCommentLength: number
      engagementLevel: string
    }>
    activityHeatmap: {
      grid: Array<{
        day: string
        dayIndex: number
        hours: Array<{
          hour: number
          hourLabel: string
          activityCount: number
          intensity: string
        }>
      }>
      peakTime: {
        day: string
        hour: string
        activityCount: number
      }
    }
    taskAging: {
      stuckTasks: Array<{
        taskId: number
        title: string
        status: string
        daysStuck: number
        urgency: string
      }>
      summary: {
        totalStuck: number
        highUrgency: number
        mediumUrgency: number
        avgDaysStuck: number
      }
    }
    commentSentiment: {
      comments: Array<{
        taskId: number
        agentName: string
        sentiment: string
        confidence: number
        preview: string
      }>
      summary: {
        positive: number
        negative: number
        neutral: number
        overallSentiment: string
      }
    }
    taskTrend: Array<{
      date: string
      creations: number
      completions: number
      net: number
    }>
  }
}

export function AdditionalAnalytics({ data }: AdditionalAnalyticsProps) {
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
              {entry.name}: {entry.value}
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

  const priorityColors = [
    actualTheme === 'dark' ? '#60a5fa' : '#3b82f6',  // Low
    actualTheme === 'dark' ? '#fbbf24' : '#f59e0b',  // Medium
    actualTheme === 'dark' ? '#f87171' : '#ef4444',  // High
    actualTheme === 'dark' ? '#dc2626' : '#b91c1c'   // Urgent
  ]

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return actualTheme === 'dark' ? '#dc2626' : '#b91c1c'
      case 'medium': return actualTheme === 'dark' ? '#f59e0b' : '#d97706'
      case 'low': return actualTheme === 'dark' ? '#10b981' : '#059669'
      case 'none': return actualTheme === 'dark' ? '#374151' : '#e5e7eb'
      default: return actualTheme === 'dark' ? '#374151' : '#e5e7eb'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500'
      case 'negative': return 'text-red-500'
      case 'neutral': return actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
      default: return actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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
              Total Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className={cn(
                'text-2xl font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.commentEngagement.reduce((sum, agent) => sum + agent.commentCount, 0)}
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
                {data.taskAging.summary.totalStuck}
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
              Peak Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className={cn(
                'text-lg font-bold',
                actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
              )}>
                {data.activityHeatmap.peakTime.day} {data.activityHeatmap.peakTime.hour}
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
              Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <TrendingUp className={cn(
                'h-4 w-4',
                getSentimentColor(data.commentSentiment.summary.overallSentiment)
              )} />
              <span className={cn(
                'text-lg font-bold capitalize',
                getSentimentColor(data.commentSentiment.summary.overallSentiment)
              )}>
                {data.commentSentiment.summary.overallSentiment}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution Pie Chart */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Task Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.priorityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${((entry.value / data.priorityDistribution.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={priorityColors[index % priorityColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comment Engagement */}
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Comment Engagement by Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.commentEngagement} layout="horizontal">
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                  />
                  <XAxis type="number" stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis 
                    type="category" 
                    dataKey="agentName" 
                    stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="commentCount" fill={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'} name="Comments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Heatmap */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Activity Heatmap (Last 7 Days)
          </CardTitle>
          <p className={cn(
            'text-sm',
            actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            Peak activity: {data.activityHeatmap.peakTime.day} at {data.activityHeatmap.peakTime.hour} ({data.activityHeatmap.peakTime.activityCount} activities)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.activityHeatmap.grid.map((dayData) => (
              <div key={dayData.dayIndex} className="flex items-center space-x-2">
                <div className={cn(
                  'w-16 text-xs font-medium',
                  actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                )}>
                  {dayData.day.slice(0, 3)}
                </div>
                <div className="flex space-x-1">
                  {dayData.hours.map((hour) => (
                    <div
                      key={hour.hour}
                      className="w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110"
                      style={{ 
                        backgroundColor: getIntensityColor(hour.intensity),
                        opacity: hour.intensity === 'none' ? 0.3 : 1
                      }}
                      title={`${dayData.day} ${hour.hourLabel}: ${hour.activityCount} activities`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('none') }} />
              <span className={cn(actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>None</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('low') }} />
              <span className={cn(actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>Low</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('medium') }} />
              <span className={cn(actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>Medium</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor('high') }} />
              <span className={cn(actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>High</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Creation vs Completion Trend */}
      <Card className={cn(
        actualTheme === 'dark' 
          ? 'bg-slate-800/50 border-slate-700/50' 
          : 'bg-white border-slate-200'
      )}>
        <CardHeader>
          <CardTitle className={cn(
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Task Creation vs Completion Trend (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.taskTrend}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="date" 
                  stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="creations" 
                  stroke={actualTheme === 'dark' ? '#60a5fa' : '#3b82f6'} 
                  name="Tasks Created" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke={actualTheme === 'dark' ? '#34d399' : '#10b981'} 
                  name="Tasks Completed" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Task Aging Analysis */}
      {data.taskAging.stuckTasks.length > 0 && (
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
            <p className={cn(
              'text-sm',
              actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            )}>
              {data.taskAging.summary.highUrgency} high urgency, {data.taskAging.summary.mediumUrgency} medium urgency
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.taskAging.stuckTasks.slice(0, 8).map((task) => (
                <div key={task.taskId} className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                )}>
                  <div className="flex-1">
                    <h4 className={cn(
                      'font-medium truncate max-w-xs',
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
                  <div className="flex items-center space-x-2">
                    <Badge variant={task.urgency === 'high' ? 'destructive' : task.urgency === 'medium' ? 'secondary' : 'default'}>
                      {task.urgency}
                    </Badge>
                    <span className={cn(
                      'text-sm font-medium',
                      getUrgencyColor(task.urgency)
                    )}>
                      {task.daysStuck}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comment Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Comment Sentiment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className={cn(
                    'text-2xl font-bold text-green-500'
                  )}>
                    {data.commentSentiment.summary.positive}
                  </div>
                  <div className={cn(
                    'text-xs',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    Positive
                  </div>
                </div>
                <div>
                  <div className={cn(
                    'text-2xl font-bold',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    {data.commentSentiment.summary.neutral}
                  </div>
                  <div className={cn(
                    'text-xs',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    Neutral
                  </div>
                </div>
                <div>
                  <div className={cn(
                    'text-2xl font-bold text-red-500'
                  )}>
                    {data.commentSentiment.summary.negative}
                  </div>
                  <div className={cn(
                    'text-xs',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    Negative
                  </div>
                </div>
              </div>
              
              <div className={cn(
                'p-3 rounded-lg text-center',
                actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100/50'
              )}>
                <span className={cn(
                  'text-sm',
                  actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                )}>
                  Overall Sentiment: 
                </span>
                <span className={cn(
                  'ml-2 font-medium capitalize',
                  getSentimentColor(data.commentSentiment.summary.overallSentiment)
                )}>
                  {data.commentSentiment.summary.overallSentiment}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          actualTheme === 'dark' 
            ? 'bg-slate-800/50 border-slate-700/50' 
            : 'bg-white border-slate-200'
        )}>
          <CardHeader>
            <CardTitle className={cn(
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              Recent Comment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data.commentSentiment.comments.slice(0, 5).map((comment, index) => (
                <div key={index} className={cn(
                  'p-3 rounded-lg',
                  actualTheme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'text-sm font-medium',
                      actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                    )}>
                      {comment.agentName}
                    </span>
                    <Badge variant={
                      comment.sentiment === 'positive' ? 'default' :
                      comment.sentiment === 'negative' ? 'destructive' : 'outline'
                    }>
                      {comment.sentiment}
                    </Badge>
                  </div>
                  <p className={cn(
                    'text-xs',
                    actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  )}>
                    {comment.preview}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}