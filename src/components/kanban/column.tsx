'use client'

import { Task, TaskStatus } from '@/types'
import { TaskCard } from './task-card'
import { Plus } from 'lucide-react'

interface ColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  color: string
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

export function Column({ title, status, tasks, color, onCreateTask, onEditTask, onDeleteTask }: ColumnProps) {
  const totalTasks = tasks.length
  const completionRatio = status === 'done' ? 1 : 
    status === 'blocked' ? 0 : 
    Math.max(0.1, Math.min(0.9, totalTasks > 0 ? 0.5 : 0))

  return (
    <div className="flex-1 min-w-[300px] max-w-sm">
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
      <div className="space-y-0 min-h-[200px]">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))
        ) : (
          <div className="text-center py-8 text-slate-500">
            <div className="text-3xl mb-2">
              {statusIcons[status]}
            </div>
            <p className="text-sm">No tasks in {title.toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  )
}