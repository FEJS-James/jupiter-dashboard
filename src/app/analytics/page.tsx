'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Download, RefreshCw, BarChart3, TrendingUp, Users, Zap } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'

// Chart components
import { OverviewCards } from '@/components/analytics/overview-cards'
import { VelocityCharts } from '@/components/analytics/velocity-charts'
import { CompletionAnalytics } from '@/components/analytics/completion-analytics'
import { AgentWorkloadCharts } from '@/components/analytics/agent-workload-charts'
import { ProjectPerformanceCharts } from '@/components/analytics/project-performance-charts'
import { AdditionalAnalytics } from '@/components/analytics/additional-analytics'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="h-12 w-12 text-slate-400 mb-4" />
      <p className="text-slate-500 dark:text-slate-400 text-lg">{message}</p>
      <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting your date range or check back later.</p>
    </div>
  )
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

export default function AnalyticsPage() {
  const { actualTheme } = useTheme()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Analytics data states
  const [overviewData, setOverviewData] = useState<any>(null)
  const [velocityData, setVelocityData] = useState<any>(null)
  const [completionData, setCompletionData] = useState<any>(null)
  const [agentData, setAgentData] = useState<any>(null)
  const [projectData, setProjectData] = useState<any>(null)
  const [additionalData, setAdditionalData] = useState<any>(null)

  // Load analytics data
  const loadAnalyticsData = async (showLoading = true) => {
    if (showLoading) setLoading(true)

    try {
      const params = new URLSearchParams()
      if (dateRange.from) params.set('startDate', dateRange.from.toISOString())
      if (dateRange.to) params.set('endDate', dateRange.to.toISOString())

      // Velocity endpoint uses 'days' param instead of startDate/endDate
      const velocityParams = new URLSearchParams()
      if (dateRange.from && dateRange.to) {
        const diffDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        velocityParams.set('days', String(Math.max(1, Math.min(diffDays, 365))))
      }

      const endpoints = [
        `/api/analytics/overview?${params}`,
        `/api/analytics/velocity?${velocityParams}`,
        `/api/analytics/completion?${params}`,
        `/api/analytics/agents?${params}`,
        `/api/analytics/projects?${params}`,
        `/api/analytics/additional?${params}`
      ]

      const responses = await Promise.all(
        endpoints.map(endpoint => fetch(endpoint))
      )

      const [overview, velocity, completion, agents, projects, additional] = await Promise.all(
        responses.map(res => res.json())
      )

      if (overview.success) setOverviewData(overview.data)
      if (velocity.success) setVelocityData(velocity.data)
      if (completion.success) setCompletionData(completion.data)
      if (agents.success) setAgentData(agents.data)
      if (projects.success) setProjectData(projects.data)
      if (additional.success) setAdditionalData(additional.data)

      if (!showLoading) {
        toast.success('Analytics data refreshed')
      }

    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Load data on component mount and date range change
  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [dateRange])

  const handleRefresh = () => {
    loadAnalyticsData(false)
  }

  const handleExport = () => {
    // Implement CSV export functionality
    toast.info('Export functionality coming soon')
  }

  const formatDateRange = () => {
    if (!dateRange.from) return 'Select date range'
    if (!dateRange.to) return format(dateRange.from, 'MMM d, yyyy')
    return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
  }

  if (loading && !overviewData) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          <h1 className={cn(
            'text-2xl font-bold',
            actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
          )}>
            Dashboard Analytics
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Date Range Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal min-w-[240px]',
                  !dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={{
                  from: dateRange.from,
                  to: dateRange.to
                }}
                onSelect={(range) => {
                  setDateRange({
                    from: range?.from,
                    to: range?.to
                  })
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overviewData ? (
        <OverviewCards data={overviewData} />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-lg" />
          ))}
        </div>
      ) : null}

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Velocity</span>
          </TabsTrigger>
          <TabsTrigger value="completion" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Completion</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Agents</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="additional" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">More</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {velocityData ? (
            <VelocityCharts data={velocityData} />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            <EmptyState message="No velocity data available" />
          )}
        </TabsContent>

        <TabsContent value="completion" className="space-y-6">
          {completionData ? (
            <CompletionAnalytics data={completionData} />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            <EmptyState message="No completion data available" />
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {agentData ? (
            <AgentWorkloadCharts data={agentData} />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            <EmptyState message="No agent data available" />
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {projectData ? (
            <ProjectPerformanceCharts data={projectData} />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            <EmptyState message="No project data available" />
          )}
        </TabsContent>

        <TabsContent value="additional" className="space-y-6">
          {additionalData ? (
            <AdditionalAnalytics data={additionalData} />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            <EmptyState message="No additional analytics available" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}