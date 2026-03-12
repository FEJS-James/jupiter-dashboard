'use client'

import { Task, TaskStatus } from '@/types'
import { Column } from './column'

interface BoardProps {
  tasks: Task[]
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

export function Board({ tasks }: BoardProps) {
  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  return (
    <div className="flex-1 overflow-hidden">
      {/* Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">
              Project Board
            </h1>
            <p className="text-slate-400">
              {tasks.length} total tasks across {columnConfig.length} columns
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
          />
        ))}
      </div>
    </div>
  )
}