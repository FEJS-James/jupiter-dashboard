'use client'

import { useState, useRef, useEffect } from 'react'
import { DragDropContext, DropResult, Droppable, Draggable } from '@hello-pangea/dnd'
import { Task, TaskStatus } from '@/types'
import { MobileColumn } from './mobile-column'
import { MobileTaskCard } from './mobile-task-card'
import { useMediaQuery } from '@/hooks/use-media-query'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface MobileBoardProps {
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
  shortTitle: string
}> = [
  { title: 'Backlog', status: 'backlog', color: '#64748b', shortTitle: 'Backlog' },
  { title: 'In Progress', status: 'in-progress', color: '#10b981', shortTitle: 'Progress' },
  { title: 'Code Review', status: 'code-review', color: '#f59e0b', shortTitle: 'Review' },
  { title: 'Testing', status: 'testing', color: '#8b5cf6', shortTitle: 'Testing' },
  { title: 'Deploying', status: 'deploying', color: '#06b6d4', shortTitle: 'Deploy' },
  { title: 'Done', status: 'done', color: '#059669', shortTitle: 'Done' },
]

export function MobileBoard({ tasks, onCreateTask, onEditTask, onDeleteTask, onMoveTask }: MobileBoardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'columns' | 'single'>('columns')
  
  const { actualTheme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleDragStart = (start: any) => {
    setIsDragging(true)
    const task = tasks.find(t => t.id.toString() === start.draggableId)
    setDraggedTask(task || null)
  }

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false)
    setDraggedTask(null)

    const { destination, source, draggableId } = result

    if (!destination) return

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
    }
  }

  const navigateColumn = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentColumnIndex > 0) {
      setCurrentColumnIndex(currentColumnIndex - 1)
    } else if (direction === 'next' && currentColumnIndex < columnConfig.length - 1) {
      setCurrentColumnIndex(currentColumnIndex + 1)
    }
  }

  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const columnWidth = scrollContainerRef.current.clientWidth / 2.5
      scrollContainerRef.current.scrollTo({
        left: index * columnWidth,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    if (viewMode === 'columns') {
      scrollToColumn(currentColumnIndex)
    }
  }, [currentColumnIndex, viewMode])

  if (!isMobile) {
    // Return to desktop board for non-mobile screens
    return null
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-hidden">
        {/* Mobile Board Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-slate-100 mb-1">
                Project Board
              </h1>
              <p className="text-sm text-slate-400">
                {tasks.length} tasks across {columnConfig.length} stages
              </p>
            </div>
            
            <button
              onClick={() => setViewMode(viewMode === 'columns' ? 'single' : 'columns')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                actualTheme === 'dark' 
                  ? 'hover:bg-slate-800/50 text-slate-400' 
                  : 'hover:bg-slate-100/50 text-slate-600'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2 mb-4">
            <div className={cn(
              'flex p-1 rounded-lg',
              actualTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
            )}>
              <button
                onClick={() => setViewMode('columns')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'columns'
                    ? 'bg-blue-600 text-white'
                    : actualTheme === 'dark'
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                )}
              >
                Columns
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'single'
                    ? 'bg-blue-600 text-white'
                    : actualTheme === 'dark'
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-700 hover:text-slate-900'
                )}
              >
                Single
              </button>
            </div>
          </div>

          {/* Column Status Indicators */}
          <div className="flex items-center justify-between text-xs">
            {columnConfig.map((column, index) => (
              <div key={column.status} className="flex flex-col items-center">
                <div 
                  className="w-3 h-3 rounded-full mb-1"
                  style={{ backgroundColor: column.color }}
                />
                <span className={cn(
                  'text-xs',
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                )}>
                  {tasksByStatus[column.status]?.length || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Board Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'single' ? (
            <motion.div
              key="single-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Single Column Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateColumn('prev')}
                  disabled={currentColumnIndex === 0}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    currentColumnIndex === 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : actualTheme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-800/50'
                        : 'text-slate-700 hover:bg-slate-100/50'
                  )}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-center">
                  <h2 className={cn(
                    'text-lg font-semibold',
                    actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
                  )}>
                    {columnConfig[currentColumnIndex].title}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {tasksByStatus[columnConfig[currentColumnIndex].status]?.length || 0} tasks
                  </p>
                </div>

                <button
                  onClick={() => navigateColumn('next')}
                  disabled={currentColumnIndex === columnConfig.length - 1}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    currentColumnIndex === columnConfig.length - 1
                      ? 'text-slate-600 cursor-not-allowed'
                      : actualTheme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-800/50'
                        : 'text-slate-700 hover:bg-slate-100/50'
                  )}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Single Column Content */}
              <MobileColumn
                key={columnConfig[currentColumnIndex].status}
                title={columnConfig[currentColumnIndex].title}
                status={columnConfig[currentColumnIndex].status}
                tasks={tasksByStatus[columnConfig[currentColumnIndex].status] || []}
                color={columnConfig[currentColumnIndex].color}
                isDragging={isDragging}
                onCreateTask={onCreateTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                isSingleView={true}
              />
            </motion.div>
          ) : (
            <motion.div
              key="columns-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="overflow-hidden"
            >
              {/* Horizontal Scrolling Columns */}
              <div 
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {columnConfig.map(({ title, status, color, shortTitle }) => (
                  <div key={status} className="snap-start">
                    <MobileColumn
                      title={title}
                      shortTitle={shortTitle}
                      status={status}
                      tasks={tasksByStatus[status] || []}
                      color={color}
                      isDragging={isDragging}
                      onCreateTask={onCreateTask}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                      isSingleView={false}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag Indicator */}
        <AnimatePresence>
          {isDragging && draggedTask && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                'fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50',
                actualTheme === 'dark' 
                  ? 'bg-slate-800 text-slate-200 border border-slate-700' 
                  : 'bg-white text-slate-800 border border-slate-200'
              )}
            >
              <p className="text-sm font-medium">
                Moving "{draggedTask.title}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DragDropContext>
  )
}