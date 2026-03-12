'use client'

import { Suspense } from 'react'
import TasksPageContentRealtime from './tasks-page-content-realtime'
import { Skeleton } from '@/components/ui/skeleton'

function TasksPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-80" />
        ))}
      </div>
    </div>
  )
}

export default function TasksPageWrapper() {
  return (
    <Suspense fallback={<TasksPageSkeleton />}>
      <TasksPageContentRealtime />
    </Suspense>
  )
}