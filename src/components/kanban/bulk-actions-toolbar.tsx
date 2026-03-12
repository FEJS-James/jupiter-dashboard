'use client'

import { useState } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { 
  Move,
  Users,
  AlertTriangle,
  Trash2,
  Download,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  Tag,
  Calendar,
  MoreHorizontal,
  Keyboard,
} from 'lucide-react'
import { useBulkTasks } from '@/contexts/bulk-task-context'
import { cn } from '@/lib/utils'
import { BulkDeleteDialog } from './bulk-delete-dialog'
import { BulkShortcutsHelp } from './bulk-shortcuts-help'

interface BulkActionsToolbarProps {
  tasks: Task[]
  agents: Array<{
    id: number
    name: string
    role: string
    color: string
    status: string
  }>
  onBulkMove?: (taskIds: number[], newStatus: TaskStatus) => Promise<void>
  onBulkAssign?: (taskIds: number[], agentName: string | null) => Promise<void>
  onBulkPriority?: (taskIds: number[], priority: TaskPriority) => Promise<void>
  onBulkDelete?: (taskIds: number[]) => Promise<void>
  onBulkTag?: (taskIds: number[], tags: string[], action: 'add' | 'remove') => Promise<void>
}

const statusOptions: Array<{ label: string; value: TaskStatus; color: string }> = [
  { label: 'Backlog', value: 'backlog', color: '#64748b' },
  { label: 'In Progress', value: 'in-progress', color: '#10b981' },
  { label: 'Code Review', value: 'code-review', color: '#f59e0b' },
  { label: 'Testing', value: 'testing', color: '#8b5cf6' },
  { label: 'Deploying', value: 'deploying', color: '#06b6d4' },
  { label: 'Done', value: 'done', color: '#059669' },
]

const priorityOptions: Array<{ label: string; value: TaskPriority; color: string }> = [
  { label: 'Low', value: 'low', color: '#64748b' },
  { label: 'Medium', value: 'medium', color: '#3b82f6' },
  { label: 'High', value: 'high', color: '#f59e0b' },
  { label: 'Urgent', value: 'urgent', color: '#ef4444' },
]

export function BulkActionsToolbar({
  tasks,
  agents,
  onBulkMove,
  onBulkAssign,
  onBulkPriority,
  onBulkDelete,
  onBulkTag,
}: BulkActionsToolbarProps) {
  const {
    selectedTasks,
    selectedCount,
    clearSelection,
    selectAll,
    operationInProgress,
    lastOperation,
  } = useBulkTasks()
  
  const [operationProgress, setOperationProgress] = useState(0)
  const [showProgress, setShowProgress] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const allSelected = selectedCount === tasks.length && tasks.length > 0
  const someSelected = selectedCount > 0 && selectedCount < tasks.length

  const handleBulkOperation = async (
    operation: string,
    asyncOperation: () => Promise<void>
  ) => {
    if (selectedCount === 0) return
    
    try {
      setShowProgress(true)
      setOperationProgress(0)
      
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => Math.min(prev + 10, 90))
      }, 100)
      
      await asyncOperation()
      
      clearInterval(progressInterval)
      setOperationProgress(100)
      
      // Hide progress after completion
      setTimeout(() => {
        setShowProgress(false)
        setOperationProgress(0)
        clearSelection()
      }, 1000)
      
    } catch (error) {
      setShowProgress(false)
      setOperationProgress(0)
      console.error(`Bulk ${operation} failed:`, error)
      // Error handling could include toast notifications
    }
  }

  const handleSelectAllToggle = () => {
    if (allSelected || someSelected) {
      clearSelection()
    } else {
      selectAll(tasks)
    }
  }

  const handleBulkMove = async (newStatus: TaskStatus) => {
    if (!onBulkMove) return
    
    const taskIds = selectedTasks.map(task => task.id)
    await handleBulkOperation('move', () => onBulkMove(taskIds, newStatus))
  }

  const handleBulkAssign = async (agentName: string | null) => {
    if (!onBulkAssign) return
    
    const taskIds = selectedTasks.map(task => task.id)
    await handleBulkOperation('assign', () => onBulkAssign(taskIds, agentName))
  }

  const handleBulkPriority = async (priority: TaskPriority) => {
    if (!onBulkPriority) return
    
    const taskIds = selectedTasks.map(task => task.id)
    await handleBulkOperation('priority update', () => onBulkPriority(taskIds, priority))
  }

  const handleBulkDelete = async (reason?: string) => {
    if (!onBulkDelete) return
    
    const taskIds = selectedTasks.map(task => task.id)
    setShowDeleteDialog(false)
    await handleBulkOperation('delete', () => onBulkDelete(taskIds))
  }

  const openDeleteDialog = () => {
    setShowDeleteDialog(true)
  }

  if (selectedCount === 0 && !showProgress) {
    return null
  }

  return (
    <div className={cn(
      'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
      'bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl backdrop-blur-sm',
      'p-4 min-w-96 max-w-4xl',
      'transition-all duration-300 ease-in-out',
      showProgress && 'pb-6'
    )}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">
              {lastOperation && `Performing ${lastOperation}...`}
            </span>
            <span className="text-sm text-slate-400">
              {Math.round(operationProgress)}%
            </span>
          </div>
          <Progress 
            value={operationProgress} 
            className="h-2 bg-slate-800"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAllToggle}
            className="p-1 h-8 w-8"
            disabled={operationInProgress}
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-400" />
            ) : someSelected ? (
              <Square className="h-4 w-4 text-blue-400 opacity-60" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-500/30">
              {selectedCount} selected
            </Badge>
            
            {selectedCount > 0 && (
              <span className="text-sm text-slate-400">
                of {tasks.length} tasks
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!showProgress && (
          <div className="flex items-center gap-2">
            {/* Move Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={operationInProgress || selectedCount === 0}
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  <Move className="h-4 w-4 mr-1" />
                  Move
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                {statusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    onClick={() => handleBulkMove(status.value)}
                    className="hover:bg-slate-800"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: status.color }}
                    />
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assign Agent */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={operationInProgress || selectedCount === 0}
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Assign
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                <DropdownMenuItem
                  onClick={() => handleBulkAssign(null)}
                  className="hover:bg-slate-800"
                >
                  <Users className="h-4 w-4 mr-2 text-slate-400" />
                  Unassign
                </DropdownMenuItem>
                <Separator className="bg-slate-700" />
                {agents.map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => handleBulkAssign(agent.name)}
                    className="hover:bg-slate-800"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: agent.color }}
                    />
                    {agent.name}
                    <Badge 
                      variant="outline" 
                      className="ml-auto text-xs bg-slate-800 border-slate-600"
                    >
                      {agent.role}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Set Priority */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={operationInProgress || selectedCount === 0}
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Priority
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                {priorityOptions.map((priority) => (
                  <DropdownMenuItem
                    key={priority.value}
                    onClick={() => handleBulkPriority(priority.value)}
                    className="hover:bg-slate-800"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: priority.color }}
                    />
                    {priority.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={operationInProgress || selectedCount === 0}
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                <DropdownMenuItem className="hover:bg-slate-800">
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Tags
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-slate-800">
                  <Calendar className="h-4 w-4 mr-2" />
                  Set Due Date
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-slate-800">
                  <Download className="h-4 w-4 mr-2" />
                  Export Tasks
                </DropdownMenuItem>
                <Separator className="bg-slate-700" />
                <DropdownMenuItem 
                  onClick={openDeleteDialog}
                  className="hover:bg-red-950 text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tasks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6 bg-slate-600" />

            {/* Keyboard Shortcuts Help */}
            <BulkShortcutsHelp>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                title="Keyboard shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </BulkShortcutsHelp>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={operationInProgress}
              className="h-8 w-8 p-1 text-slate-400 hover:text-slate-300 hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        tasks={selectedTasks}
        onConfirm={handleBulkDelete}
        isDeleting={operationInProgress}
      />
    </div>
  )
}