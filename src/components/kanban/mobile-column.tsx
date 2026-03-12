'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Task, TaskStatus } from '@/types'
import { MobileTaskCard } from './mobile-task-card'
import { Plus, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { motion } from 'framer-motion'

interface MobileColumnProps {
  title: string
  shortTitle?: string
  status: TaskStatus
  tasks: Task[]
  color: string
  isDragging?: boolean
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  isSingleView?: boolean
}

const statusIcons: Record<TaskStatus, string> = {
  backlog: '📋',
  'in-progress': '🔄',
  'code-review': '👁️',
  testing: '🧪',
  deploying: '🚀',
  done: '✅',
  blocked: '🚫',
}

export function MobileColumn({ 
  title, 
  shortTitle, 
  status, 
  tasks, 
  color, 
  isDragging, 
  onCreateTask, 
  onEditTask, 
  onDeleteTask,
  isSingleView = false
}: MobileColumnProps) {
  const { actualTheme } = useTheme()
  const totalTasks = tasks.length
  const completionRatio = status === 'done' ? 1 : 
    status === 'blocked' ? 0 : 
    Math.max(0.1, Math.min(0.9, totalTasks > 0 ? 0.5 : 0))

  return (
    <div 
      className={cn(
        'flex flex-col',
        isSingleView 
          ? 'w-full' 
          : 'min-w-[280px] max-w-[280px] flex-shrink-0'
      )}
      data-column-status={status}
    >
      {/* Column Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{statusIcons[status]}</span>
            <div>
              <h2 className={cn(
                'font-semibold',
                isSingleView ? 'text-lg' : 'text-base',
                actualTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              )}>
                {isSingleView ? title : (shortTitle || title)}
              </h2>
              <span className="text-xs text-slate-500">
                {totalTasks} task{totalTasks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              className={cn(
                'p-2 rounded-lg transition-colors',
                actualTheme === 'dark'
                  ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100/50'
              )}
              onClick={() => onCreateTask?.(status)}
              title={`Add task to ${title}`}
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {!isSingleView && (
              <button 
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  actualTheme === 'dark'
                    ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100/50'
                )}
                title="Column options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={cn(
          'w-full rounded-full h-2 mb-3',
          actualTheme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
        )}>
          <motion.div 
            className="h-2 rounded-full transition-all duration-500"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${completionRatio * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>

        {/* Task count and status */}
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'font-medium',
            actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          )}>
            {totalTasks === 0 
              ? 'No tasks' 
              : `${totalTasks} task${totalTasks !== 1 ? 's' : ''}`
            }
          </span>
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      {/* Tasks Container */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 space-y-2 rounded-lg p-2 transition-all duration-200',
              isSingleView ? 'min-h-[400px]' : 'min-h-[300px]',
              snapshot.isDraggingOver 
                ? actualTheme === 'dark'
                  ? 'bg-slate-800/50 border-2 border-dashed border-slate-600' 
                  : 'bg-slate-100/50 border-2 border-dashed border-slate-300'
                : isDragging 
                  ? actualTheme === 'dark'
                    ? 'border border-slate-700/50' 
                    : 'border border-slate-200/50'
                  : ''
            )}
          >
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <MobileTaskCard 
                  key={task.id} 
                  task={task}
                  index={index}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  isCompact={!isSingleView}
                />
              ))
            ) : (
              <div className={cn(
                'text-center py-12 transition-all duration-200',
                snapshot.isDraggingOver 
                  ? actualTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  : actualTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              )}>
                <div className="text-4xl mb-3">
                  {statusIcons[status]}
                </div>
                <p className="text-sm font-medium mb-1">
                  {snapshot.isDraggingOver ? 'Drop task here' : `No tasks in ${title.toLowerCase()}`}
                </p>
                <p className="text-xs opacity-75">
                  {snapshot.isDraggingOver 
                    ? 'Release to move task'
                    : 'Tap + to add a new task'
                  }
                </p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}