'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

function DialogSkeleton() {
  return null // Dialogs render nothing when closed, no skeleton needed
}

export const LazyTaskFormDialog = dynamic(
  () => import('@/components/kanban/task-form-dialog').then(mod => ({ default: mod.TaskFormDialog })),
  { loading: () => <DialogSkeleton />, ssr: false },
)

export const LazyDeleteTaskDialog = dynamic(
  () => import('@/components/kanban/delete-task-dialog').then(mod => ({ default: mod.DeleteTaskDialog })),
  { loading: () => <DialogSkeleton />, ssr: false },
)

export const LazyBulkActionsToolbar = dynamic(
  () => import('@/components/kanban/bulk-actions-toolbar').then(mod => ({ default: mod.BulkActionsToolbar })),
  { ssr: false },
)
