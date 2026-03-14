'use client'

import { useState, useMemo, useCallback } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Task, TaskStatus } from '@/types'
import { Column } from './column'
import { MobileBoard } from './mobile-board'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useMounted } from '@/hooks/use-mounted'

interface BoardProps {
  tasks: (Task & { isOptimistic?: boolean })[]
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  onMoveTask?: (taskId: number, newStatus: TaskStatus) => Promise<void>
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

export function Board({ tasks, onCreateTask, onEditTask, onDeleteTask, onMoveTask }: BoardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const mounted = useMounted()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Use mobile board on mobile devices — only after mount to avoid hydration mismatch
  if (mounted && isMobile) {
    return (
      <MobileBoard 
        tasks={tasks}
        onCreateTask={onCreateTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onMoveTask={onMoveTask}
      />
    )
  }

  // Group tasks by status (memoized)
  const tasksByStatus = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = []
      }
      acc[task.status].push(task)
      return acc
    }, {} as Record<TaskStatus, Task[]>)
  }, [tasks])

  const handleDragStart = useCallback((start: any) => {
    setIsDragging(true)
    const task = tasks.find(t => t.id.toString() === start.draggableId)
    setDraggedTask(task || null)
  }, [tasks])

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
    } catch (error) {
      console.error('Failed to move task:', error)
      // Optionally show user-facing error notification here
    }
  }, [onMoveTask])

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-hidden">
        {/* Board Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">
                Project Board
              </h1>
              <p className="text-slate-400">
                Showing {tasks.length} tasks across {columnConfig.length} columns
                {isDragging && draggedTask && (
                  <span className="ml-2 text-blue-400">
                    Moving "{draggedTask.title}"
                  </span>
                )}
              </p>
            </div>
            
            {/* Board Stats - Now Shows Filtered Results */}
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
            </div>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columnConfig.map(({ title, status, color }) => (
            <Column
              key={status}
              title={title}
              status={status}
              tasks={tasksByStatus[status] || []}
              color={color}
              isDragging={isDragging}
              onCreateTask={onCreateTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}