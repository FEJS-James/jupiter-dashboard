'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

function ChartSkeleton() {
  return (
    <div className="h-[200px] rounded-lg bg-slate-800/50 animate-pulse" />
  )
}

export const LazyDashboardContent = dynamic(
  () => import('@/components/dashboard/dashboard-content').then(mod => ({ default: mod.DashboardContent })),
  {
    loading: () => (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-8" role="main" aria-busy="true" aria-label="Loading dashboard">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-full sm:w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 sm:h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-64 sm:h-96" />
          <Skeleton className="h-64 sm:h-96" />
        </div>
      </div>
    ),
    ssr: false,
  },
)
