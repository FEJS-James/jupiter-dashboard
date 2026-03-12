'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Task, TaskStatus } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { EnhancedTaskCard } from './enhanced-task-card'
import { Plus, MoreVertical, CheckSquare, Square } from 'lucide-react'
import { useBulkTasks } from '@/contexts/bulk-task-context'
import { cn } from '@/lib/utils'

interface EnhancedColumnProps {
  title: string
  status: TaskStatus
  tasks: (Task & { isOptimistic?: boolean })[]
  color: string
  isDragging?: boolean
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

export function EnhancedColumn({
  title,
  status,
  tasks,
  color,
  isDragging = false,
  onCreateTask,
  onEditTask,
  onDeleteTask,
}: EnhancedColumnProps) {
  const {
    selectedTaskIds,
    selectAllInColumn,
    isSelectMode,
    setSelectMode,
  } = useBulkTasks()

  const columnTaskIds = tasks.map(task => task.id)
  const selectedInColumn = columnTaskIds.filter(id => selectedTaskIds.has(id))
  const allColumnSelected = columnTaskIds.length > 0 && selectedInColumn.length === columnTaskIds.length
  const someColumnSelected = selectedInColumn.length > 0 && selectedInColumn.length < columnTaskIds.length

  const handleColumnSelectAll = () => {
    if (!isSelectMode) {
      setSelectMode(true)
    }
    selectAllInColumn(tasks, status)
  }

  const getPriorityStats = () => {
    const stats = { low: 0, medium: 0, high: 0, urgent: 0 }
    tasks.forEach(task => {
      stats[task.priority]++
    })
    return stats
  }

  const priorityStats = getPriorityStats()
  const hasUrgentTasks = priorityStats.urgent > 0
  const hasHighPriorityTasks = priorityStats.high > 0

  return (
    <div className="flex-shrink-0 w-80">
      <Card className="h-full bg-slate-950/50 border-slate-800 p-4">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Column Selection Checkbox */}
            {(isSelectMode || selectedInColumn.length > 0) && (
              <Checkbox
                checked={allColumnSelected ? true : someColumnSelected ? "indeterminate" : false}
                onCheckedChange={handleColumnSelectAll}
                className="w-4 h-4 border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                aria-label={`Select all tasks in ${title} column`}
              />
            )}
            
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <h3 className="font-semibold text-slate-100">{title}</h3>
              <Badge 
                variant="secondary" 
                className="bg-slate-800/50 text-slate-300 border-slate-700"
              >
                {tasks.length}
              </Badge>
              {selectedInColumn.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-blue-600/20 text-blue-400 border-blue-500/30"
                >
                  {selectedInColumn.length} selected
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Priority Indicators */}
            {hasUrgentTasks && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs text-red-400">{priorityStats.urgent}</span>
              </div>
            )}
            {hasHighPriorityTasks && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-xs text-orange-400">{priorityStats.high}</span>
              </div>
            )}
            
            {/* Column Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-1 text-slate-400 hover:text-slate-300"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                <DropdownMenuItem
                  onClick={() => onCreateTask?.(status)}
                  className="hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={handleColumnSelectAll}
                  className="hover:bg-slate-800"
                >
                  {allColumnSelected || someColumnSelected ? (
                    <CheckSquare className="h-4 w-4 mr-2 text-blue-400" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {allColumnSelected ? 'Deselect All' : 'Select All'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Column Progress Indicator (for workflow awareness) */}
        {tasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Priority distribution:</span>
              <div className="flex items-center gap-1">
                {priorityStats.urgent > 0 && (
                  <span className="text-red-400">🔴 {priorityStats.urgent}</span>
                )}
                {priorityStats.high > 0 && (
                  <span className="text-orange-400">🟠 {priorityStats.high}</span>
                )}
                {priorityStats.medium > 0 && (
                  <span className="text-blue-400">🔵 {priorityStats.medium}</span>
                )}
                {priorityStats.low > 0 && (
                  <span className="text-slate-400">⚪ {priorityStats.low}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Droppable Area */}
        <Droppable droppableId={status} isDropDisabled={isSelectMode}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'min-h-32 transition-all duration-200',
                snapshot.isDraggingOver && !isSelectMode && 'bg-slate-900/30 rounded-lg',
                isSelectMode && 'opacity-80'
              )}
            >
              {tasks.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <div className="text-center">
                    <div className="text-2xl mb-2 opacity-50">📝</div>
                    <p className="text-sm">No tasks</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onCreateTask?.(status)}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-300"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add first task
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  'space-y-0',
                  isDragging && 'pointer-events-none opacity-60'
                )}>
                  {tasks.map((task, index) => (
                    <EnhancedTaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Quick Add Button */}
        {!isSelectMode && (
          <div className="mt-4">
            <Button 
              variant="ghost" 
              onClick={() => onCreateTask?.(status)}
              className="w-full justify-start text-slate-400 hover:text-slate-300 hover:bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-slate-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add task
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}