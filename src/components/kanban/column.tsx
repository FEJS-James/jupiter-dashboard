'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Task, TaskStatus } from '@/types'
import { TaskCard } from './task-card'
import { Plus } from 'lucide-react'

interface ColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  color: string
  isDragging?: boolean
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
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

export function Column({ title, status, tasks, color, isDragging, onCreateTask, onEditTask, onDeleteTask }: ColumnProps) {
  const totalTasks = tasks.length
  const completionRatio = status === 'done' ? 1 : 
    status === 'blocked' ? 0 : 
    Math.max(0.1, Math.min(0.9, totalTasks > 0 ? 0.5 : 0))

  return (
    <div 
      className="flex-1 min-w-[300px] max-w-sm" 
      data-column-status={status}
    >
      {/* Column Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusIcons[status]}</span>
            <h2 className="font-semibold text-slate-100">{title}</h2>
            <span className="text-sm text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
              {totalTasks}
            </span>
          </div>
          <button 
            className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
            onClick={() => onCreateTask?.(status)}
            title={`Add task to ${title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300`}
            style={{ 
              width: `${completionRatio * 100}%`,
              backgroundColor: color 
            }}
          />
        </div>
      </div>

      {/* Tasks Container */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              space-y-0 min-h-[200px] transition-all duration-200 rounded-lg p-2
              ${snapshot.isDraggingOver ? 'bg-slate-800/30 border-2 border-dashed border-slate-600' : ''}
              ${isDragging ? 'border border-slate-700/50' : ''}
            `}
          >
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <TaskCard 
                  key={task.id} 
                  task={task}
                  index={index}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))
            ) : (
              <div className={`text-center py-8 text-slate-500 transition-all duration-200 ${
                snapshot.isDraggingOver ? 'text-slate-400' : ''
              }`}>
                <div className="text-3xl mb-2">
                  {statusIcons[status]}
                </div>
                <p className="text-sm">
                  {snapshot.isDraggingOver ? 'Drop task here' : `No tasks in ${title.toLowerCase()}`}
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