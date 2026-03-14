'use client'

import { useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { Clock, AlertCircle, Edit, Trash2, GripVertical, MoreHorizontal, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileTaskCardProps {
  task: Task & { isOptimistic?: boolean }
  index: number
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onMoveTask?: (taskId: number, newStatus: TaskStatus) => Promise<void>
  isCompact?: boolean
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

const ALL_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'deploying', label: 'Deploying' },
  { value: 'done', label: 'Done' },
]

export function MobileTaskCard({ task, index, onEdit, onDelete, onMoveTask, isCompact = false }: MobileTaskCardProps) {
  const { actualTheme } = useTheme()
  const [showActions, setShowActions] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()

  const toggleActions = () => {
    setShowActions(!showActions)
  }

  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <Card 
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-task-id={task.id}
          className={cn(
            'task-card p-4 cursor-pointer transition-all duration-200 group',
            actualTheme === 'dark'
              ? 'bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-900/70 hover:border-slate-700'
              : 'bg-white/50 border-slate-200 backdrop-blur-sm hover:bg-white/70 hover:border-slate-300',
            'border-l-4',
            priorityColors[task.priority],
            snapshot.isDragging && 'shadow-xl shadow-slate-900/50 rotate-1 scale-105 z-50',
            snapshot.isDragging && (actualTheme === 'dark' 
              ? 'bg-slate-900/90 border-slate-600' 
              : 'bg-white/90 border-slate-400'
            )
          )}
          onClick={() => onEdit?.(task)}
        >
          {/* Task Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {/* Drag Handle */}
              <div
                {...provided.dragHandleProps}
                className={cn(
                  'mt-1 cursor-grab active:cursor-grabbing transition-opacity',
                  actualTheme === 'dark' ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500',
                  isCompact ? 'opacity-0 group-hover:opacity-100' : 'opacity-60'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    'font-medium line-clamp-2 flex-1',
                    isCompact ? 'text-sm' : 'text-base',
                    actualTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  )}>
                    {task.title}
                  </h3>
                  {task.isOptimistic && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
                {task.description && !isCompact && (
                  <p className={cn(
                    'text-xs line-clamp-2 mb-2',
                    actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  )}>
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Priority & Actions */}
            <div className="flex items-center gap-2 ml-2">
              {priorityIcons[task.priority]}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleActions()
                }}
                className={cn(
                  'p-1 rounded transition-colors',
                  actualTheme === 'dark'
                    ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tags */}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {task.tags.slice(0, isCompact ? 2 : 3).map((tag) => (
                <Badge 
                  key={tag}
                  variant="outline"
                  className={cn(
                    'text-xs px-1.5 py-0.5',
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 text-slate-300 border-slate-700'
                      : 'bg-slate-100/50 text-slate-700 border-slate-300'
                  )}
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > (isCompact ? 2 : 3) && (
                <Badge 
                  variant="outline"
                  className={cn(
                    'text-xs px-1.5 py-0.5',
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 text-slate-400 border-slate-700'
                      : 'bg-slate-100/50 text-slate-600 border-slate-300'
                  )}
                >
                  +{task.tags.length - (isCompact ? 2 : 3)}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Assigned Agent */}
              {(task.agent || task.assignedAgent) && (
                <div className="flex items-center gap-1">
                  <Avatar className="w-6 h-6">
                    <div className={cn(
                      'w-full h-full rounded-full flex items-center justify-center text-xs font-medium',
                      task.agent 
                        ? (agentColors[task.agent.role] || agentColors.coder)
                        : actualTheme === 'dark' 
                          ? 'bg-slate-700 text-slate-300' 
                          : 'bg-slate-200 text-slate-700'
                    )}>
                      {task.agent 
                        ? task.agent.name.charAt(0).toUpperCase()
                        : task.assignedAgent?.charAt(0).toUpperCase()
                      }
                    </div>
                  </Avatar>
                  {!isCompact && (
                    <span className={cn(
                      'text-xs',
                      actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    )}>
                      {task.agent?.name || task.assignedAgent}
                    </span>
                  )}
                </div>
              )}

              {/* Effort estimate */}
              {task.effort && (
                <Badge 
                  variant="outline"
                  className={cn(
                    'text-xs px-1.5 py-0.5',
                    actualTheme === 'dark'
                      ? 'bg-slate-800/50 text-slate-300 border-slate-700'
                      : 'bg-slate-100/50 text-slate-700 border-slate-300'
                  )}
                >
                  {task.effort}pt
                </Badge>
              )}
            </div>

            {/* Due date */}
            {dueDate && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue 
                  ? 'text-red-400' 
                  : actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              )}>
                <Clock className="w-3 h-3" />
                <span>
                  {isOverdue ? 'Overdue' : formatDistanceToNow(dueDate, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions Overlay */}
          <AnimatePresence>
            {showActions && !showMoveMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'absolute inset-0 backdrop-blur-sm rounded-lg flex items-center justify-center gap-3',
                  actualTheme === 'dark' 
                    ? 'bg-slate-900/80' 
                    : 'bg-white/80'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.button 
                  className={cn(
                    'p-3 rounded-full shadow-lg transition-colors',
                    actualTheme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-white hover:bg-slate-50 text-slate-700'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(task)
                    setShowActions(false)
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Edit className="w-4 h-4" />
                </motion.button>
                {onMoveTask && (
                  <motion.button 
                    className={cn(
                      'p-3 rounded-full shadow-lg transition-colors',
                      actualTheme === 'dark'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMoveMenu(true)
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button 
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(task)
                    setShowActions(false)
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <motion.button 
                  className={cn(
                    'p-3 rounded-full shadow-lg transition-colors',
                    actualTheme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-white hover:bg-slate-50 text-slate-700'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowActions(false)
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Move-to-Column Menu Overlay */}
          <AnimatePresence>
            {showMoveMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'absolute inset-0 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-1.5 p-3 z-10',
                  actualTheme === 'dark' 
                    ? 'bg-slate-900/90' 
                    : 'bg-white/90'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <p className={cn(
                  'text-xs font-medium mb-1',
                  actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                )}>
                  Move to&hellip;
                </p>
                {ALL_STATUSES
                  .filter((s) => s.value !== task.status)
                  .map((s) => (
                    <button
                      key={s.value}
                      className={cn(
                        'w-full text-sm px-3 py-1.5 rounded-md text-left transition-colors',
                        actualTheme === 'dark'
                          ? 'hover:bg-slate-700 text-slate-200'
                          : 'hover:bg-slate-100 text-slate-700'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveTask?.(task.id, s.value)
                        setShowMoveMenu(false)
                        setShowActions(false)
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                <button
                  className={cn(
                    'mt-1 text-xs px-3 py-1 rounded-md transition-colors',
                    actualTheme === 'dark'
                      ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoveMenu(false)
                  }}
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </Draggable>
  )
}