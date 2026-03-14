'use client'

import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Task, TaskPriority } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { Clock, AlertCircle, Edit, Trash2, GripVertical } from 'lucide-react'

interface TaskCardProps {
  task: Task & { isOptimistic?: boolean }
  index: number
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'border-l-slate-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
}

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  low: null,
  medium: null,
  high: <AlertCircle className="w-3 h-3 text-orange-500" />,
  urgent: <AlertCircle className="w-3 h-3 text-red-500" />,
}

const agentColors: Record<string, string> = {
  coder: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  reviewer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  devops: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  manager: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

export const TaskCard = React.memo(function TaskCard({ task, index, onEdit, onDelete }: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()

  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-task-id={task.id}
          tabIndex={0}
          className={`
            task-card p-4 mb-3 cursor-pointer transition-all duration-200 
            bg-slate-900/50 border-slate-800 backdrop-blur-sm
            hover:bg-slate-900/70 hover:border-slate-700
            border-l-4 ${priorityColors[task.priority]}
            group select-none
            ${snapshot.isDragging ? 'shadow-xl shadow-slate-900/50 rotate-1 scale-105' : ''}
            ${snapshot.isDragging ? 'bg-slate-900/90 border-slate-600' : ''}
          `}
        >
          {/* Task Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Drag Handle */}
              <div
                {...provided.dragHandleProps}
                className="mt-1 text-slate-500 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3 h-3" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-slate-100 line-clamp-2 flex-1">
                    {task.title}
                  </h3>
                  {task.isOptimistic && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Priority indicator */}
            {priorityIcons[task.priority] && (
              <div className="ml-2 flex-shrink-0">
                {priorityIcons[task.priority]}
              </div>
            )}
          </div>

      {/* Tags */}
      {Array.isArray(task.tags) && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag}
              variant="outline"
              className="text-xs px-1.5 py-0.5 bg-slate-800/50 text-slate-300 border-slate-700"
            >
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge 
              variant="outline"
              className="text-xs px-1.5 py-0.5 bg-slate-800/50 text-slate-400 border-slate-700"
            >
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Assigned Agent */}
          {task.agent ? (
            <div className="flex items-center gap-1">
              <Avatar className="w-6 h-6">
                <div className={`w-full h-full rounded-full flex items-center justify-center text-xs font-medium ${agentColors[task.agent.role] || agentColors.coder}`}>
                  {task.agent.name.charAt(0).toUpperCase()}
                </div>
              </Avatar>
            </div>
          ) : task.assignedAgent && (
            <div className="flex items-center gap-1">
              <Avatar className="w-6 h-6">
                <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                  {task.assignedAgent.charAt(0).toUpperCase()}
                </div>
              </Avatar>
            </div>
          )}

          {/* Effort estimate */}
          {task.effort && (
            <Badge 
              variant="outline"
              className="text-xs px-1.5 py-0.5 bg-slate-800/50 text-slate-300 border-slate-700"
            >
              {task.effort}pt
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Due date */}
          {dueDate && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" />
              <span>
                {isOverdue ? 'Overdue' : formatDistanceToNow(dueDate, { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Hover actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
            <button 
              className="p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(task)
              }}
              title="Edit task"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button 
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(task)
              }}
              title="Delete task"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
        </Card>
      )}
    </Draggable>
  )
})