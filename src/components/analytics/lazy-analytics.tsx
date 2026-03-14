'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

function AnalyticsChartSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
      ))}
    </div>
  )
}

export const LazyVelocityCharts = dynamic(
  () => import('@/components/analytics/velocity-charts').then(mod => ({ default: mod.VelocityCharts })),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false,
  },
)

export const LazyCompletionAnalytics = dynamic(
  () => import('@/components/analytics/completion-analytics').then(mod => ({ default: mod.CompletionAnalytics })),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false,
  },
)

export const LazyAgentWorkloadCharts = dynamic(
  () => import('@/components/analytics/agent-workload-charts').then(mod => ({ default: mod.AgentWorkloadCharts })),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false,
  },
)

export const LazyProjectPerformanceCharts = dynamic(
  () => import('@/components/analytics/project-performance-charts').then(mod => ({ default: mod.ProjectPerformanceCharts })),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false,
  },
)

export const LazyAdditionalAnalytics = dynamic(
  () => import('@/components/analytics/additional-analytics').then(mod => ({ default: mod.AdditionalAnalytics })),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false,
  },
)
