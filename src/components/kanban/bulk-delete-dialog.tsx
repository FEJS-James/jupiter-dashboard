'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Task } from '@/types'
import { Trash2, AlertTriangle } from 'lucide-react'

interface BulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  onConfirm: (reason?: string) => void
  isDeleting?: boolean
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  tasks,
  onConfirm,
  isDeleting = false,
}: BulkDeleteDialogProps) {
  const [reason, setReason] = useState('')
  const [showTaskList, setShowTaskList] = useState(false)

  const handleConfirm = () => {
    onConfirm(reason || undefined)
    setReason('')
    setShowTaskList(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
    setReason('')
    setShowTaskList(false)
  }

  // Group tasks by status for better overview
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const statusLabels = {
    'backlog': 'Backlog',
    'in-progress': 'In Progress',
    'code-review': 'Code Review',
    'testing': 'Testing',
    'deploying': 'Deploying',
    'done': 'Done',
    'blocked': 'Blocked',
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-slate-100">
                Delete {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This action cannot be undone. The selected tasks and all associated data will be permanently deleted.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Task Summary */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-100">Tasks to be deleted:</h4>
              <button
                onClick={() => setShowTaskList(!showTaskList)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {showTaskList ? 'Hide details' : 'Show details'}
              </button>
            </div>
            
            {/* Status breakdown */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className="bg-slate-700/50 text-slate-300 border-slate-600"
                >
                  {statusLabels[status as keyof typeof statusLabels]}: {statusTasks.length}
                </Badge>
              ))}
            </div>

            {/* Detailed task list */}
            {showTaskList && (
              <div className="mt-4">
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 bg-slate-700/30 rounded text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-100 truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-slate-400 text-xs truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[task.status as keyof typeof statusLabels]}
                          </Badge>
                          {task.priority !== 'medium' && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                task.priority === 'urgent' ? 'text-red-400 border-red-500/30' :
                                task.priority === 'high' ? 'text-orange-400 border-orange-500/30' :
                                'text-slate-400'
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Optional reason field */}
          <div className="space-y-2">
            <Label htmlFor="delete-reason" className="text-slate-100">
              Reason for deletion (optional)
            </Label>
            <Input
              id="delete-reason"
              placeholder="e.g., Duplicate tasks, no longer needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-800 border-slate-600 text-slate-100"
              disabled={isDeleting}
            />
          </div>

          {/* Warning message */}
          <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Trash2 className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-300 font-medium mb-1">
                  Warning: This will permanently delete:
                </p>
                <ul className="text-red-400 space-y-1">
                  <li>• All {tasks.length} selected tasks</li>
                  <li>• All comments and attachments</li>
                  <li>• All activity history</li>
                  <li>• All related notifications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isDeleting}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </div>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}