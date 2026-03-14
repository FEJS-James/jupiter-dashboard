'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { EnhancedColumn } from './enhanced-column'
import { BulkActionsToolbar } from './bulk-actions-toolbar'
import { BulkTaskProvider, useBulkTasks } from '@/contexts/bulk-task-context'
import { useBulkTaskOperations } from '@/hooks/use-bulk-task-operations'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useBulkTaskShortcuts } from '@/hooks/use-bulk-task-shortcuts'
import { toast } from 'sonner'

interface EnhancedBoardProps {
  tasks: (Task & { isOptimistic?: boolean })[]
  agents: Array<{
    id: number
    name: string
    role: string
    color: string
    status: string
  }>
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  onMoveTask?: (taskId: number, newStatus: TaskStatus) => Promise<void>
  onTasksUpdated?: () => void
  onArchiveTask?: (task: Task) => void
  onArchiveAllDone?: () => void
}

const columnConfig: Array<{
  title: string
  status: TaskStatus
  color: string
}> = [
  { title: 'Backlog', status: 'backlog', color: '#64748b' },
  { title: 'In Progress', status: 'in-progress', color: '#10b981' },
  { title: 'Code Review', status: 'code-review', color: '#f59e0b' },
  { title: 'Testing', status: 'testing', color: '#8b5cf6' },
  { title: 'Deploying', status: 'deploying', color: '#06b6d4' },
  { title: 'Done', status: 'done', color: '#059669' },
]

// Inner component that uses the bulk context
function BoardContent({
  tasks,
  agents,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onTasksUpdated,
  onArchiveTask,
  onArchiveAllDone,
}: EnhancedBoardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  
  const {
    selectedTasks,
    selectedCount,
    isSelectMode,
    setSelectMode,
    clearSelection,
  } = useBulkTasks()
  
  const {
    bulkMove,
    bulkAssign,
    bulkPriority,
    bulkDelete,
    bulkOperationWithConfirmation,
    errors,
    clearError,
  } = useBulkTaskOperations({
    onOperationComplete: (operation, result) => {
      if (result.success) {
        toast.success(result.message || `${operation} completed successfully`)
        onTasksUpdated?.()
      } else {
        toast.error(result.error || `${operation} failed`)
      }
    },
    onError: (error, operation) => {
      toast.error(`${operation} failed: ${error.message}`)
    },
  })

  // Group tasks by status (memoized — only recomputes when tasks array changes)
  const tasksByStatus = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = []
      }
      acc[task.status].push(task)
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  }, [tasks])

  // Define bulk operation handlers first
  const handleBulkMove = async (taskIds: number[], newStatus: TaskStatus) => {
    await bulkMove(taskIds, newStatus)
  }

  const handleBulkPriority = async (taskIds: number[], priority: TaskPriority) => {
    await bulkPriority(taskIds, priority)
  }

  const handleBulkDelete = async (taskIds: number[]) => {
    await bulkOperationWithConfirmation(
      'delete tasks',
      taskIds,
      'Are you sure you want to delete the selected tasks?',
      () => bulkDelete(taskIds)
    )
  }

  // Handle bulk operation shortcuts
  useBulkTaskShortcuts({
    tasks,
    onBulkMove: handleBulkMove,
    onBulkPriority: handleBulkPriority,
    onBulkDelete: handleBulkDelete,
    enabled: true,
  })

  const handleDragStart = useCallback((start: any) => {
    // Disable drag if in select mode
    if (isSelectMode) {
      return
    }
    
    setIsDragging(true)
    const task = tasks.find(t => t.id.toString() === start.draggableId)
    setDraggedTask(task || null)
  }, [isSelectMode, tasks])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false)
    setDraggedTask(null)

    const { destination, source, draggableId } = result

    // If dropped outside of any droppable area
    if (!destination) {
      return
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const taskId = parseInt(draggableId)
    const newStatus = destination.droppableId as TaskStatus
    
    try {
      await onMoveTask?.(taskId, newStatus)
      onTasksUpdated?.()
    } catch (error) {
      console.error('Failed to move task:', error)
      toast.error('Failed to move task')
    }
  }, [onMoveTask, onTasksUpdated])

  const handleBulkAssign = async (taskIds: number[], agentName: string | null) => {
    await bulkAssign(taskIds, agentName)
  }

  // Clear errors when selection changes
  useEffect(() => {
    if (selectedCount === 0) {
      clearError()
    }
  }, [selectedCount, clearError])

  return (
    <DragDropContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-hidden">
        {/* Board Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">
                Project Board
                {isSelectMode && (
                  <span className="ml-2 text-blue-400 text-lg">
                    (Selection Mode)
                  </span>
                )}
              </h1>
              <p className="text-slate-400">
                Showing {tasks.length} tasks across {columnConfig.length} columns
                {isDragging && draggedTask && (
                  <span className="ml-2 text-blue-400">
                    Moving "{draggedTask.title}"
                  </span>
                )}
                {selectedCount > 0 && (
                  <span className="ml-2 text-blue-400">
                    {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                )}
              </p>
            </div>
            
            {/* Board Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-300">
                  {tasksByStatus['done']?.length || 0} completed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">
                  {tasksByStatus['in-progress']?.length || 0} in progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span className="text-slate-300">
                  {tasksByStatus['backlog']?.length || 0} backlog
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-400">
                    {selectedCount} selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columnConfig.map(({ title, status, color }) => (
            <EnhancedColumn
              key={status}
              title={title}
              status={status}
              tasks={tasksByStatus[status] || []}
              color={color}
              isDragging={isDragging}
              onCreateTask={onCreateTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onArchiveTask={onArchiveTask}
              onArchiveAllDone={status === 'done' ? onArchiveAllDone : undefined}
            />
          ))}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        tasks={tasks}
        agents={agents}
        onBulkMove={handleBulkMove}
        onBulkAssign={handleBulkAssign}
        onBulkPriority={handleBulkPriority}
        onBulkDelete={handleBulkDelete}
      />
    </DragDropContext>
  )
}

// Main component that provides the bulk context
export function EnhancedBoard(props: EnhancedBoardProps) {
  return (
    <BulkTaskProvider tasks={props.tasks}>
      <BoardContent {...props} />
    </BulkTaskProvider>
  )
}