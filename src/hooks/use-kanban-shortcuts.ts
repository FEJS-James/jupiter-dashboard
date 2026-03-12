'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyboardShortcut } from './use-keyboard-shortcuts'
import { useKeyboardShortcutsContext } from '@/contexts/keyboard-shortcuts-context'
import { Task, TaskStatus } from '@/types'
import { toast } from 'sonner'

interface UseKanbanShortcutsOptions {
  tasks: Task[]
  onCreateTask?: (status: TaskStatus) => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  onMoveTask?: (taskId: number, newStatus: TaskStatus) => Promise<void>
  onFocusSearch?: () => void
  onClearSearch?: () => void
}

const COLUMN_STATUSES: TaskStatus[] = [
  'backlog',
  'in-progress', 
  'code-review',
  'testing',
  'deploying',
  'done'
]

export function useKanbanShortcuts({
  tasks,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onFocusSearch,
  onClearSearch
}: UseKanbanShortcutsOptions) {
  const {
    selectedTaskIndex,
    setSelectedTaskIndex,
    selectedColumnIndex,
    setSelectedColumnIndex,
    isNavigationMode,
    setIsNavigationMode,
    addShortcuts,
    removeShortcuts
  } = useKeyboardShortcutsContext()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Get current column tasks
  const getCurrentColumnTasks = useCallback(() => {
    const currentStatus = COLUMN_STATUSES[selectedColumnIndex]
    return tasks.filter(task => task.status === currentStatus)
  }, [tasks, selectedColumnIndex])

  // Update selected task when index changes
  useEffect(() => {
    const columnTasks = getCurrentColumnTasks()
    if (selectedTaskIndex >= 0 && selectedTaskIndex < columnTasks.length) {
      setSelectedTask(columnTasks[selectedTaskIndex])
      
      // Scroll task into view
      const taskElement = document.querySelector(`[data-task-id="${columnTasks[selectedTaskIndex].id}"]`)
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        
        // Add visual selection indicator
        document.querySelectorAll('[data-selected="true"]').forEach(el => {
          el.removeAttribute('data-selected')
        })
        taskElement.setAttribute('data-selected', 'true')
      }
    } else {
      setSelectedTask(null)
      // Clear all selections
      document.querySelectorAll('[data-selected="true"]').forEach(el => {
        el.removeAttribute('data-selected')
      })
    }
  }, [selectedTaskIndex, getCurrentColumnTasks])

  // Task navigation handlers
  const navigateDown = useCallback(() => {
    const columnTasks = getCurrentColumnTasks()
    const maxIndex = Math.max(0, columnTasks.length - 1)
    
    if (!isNavigationMode) {
      setIsNavigationMode(true)
      setSelectedTaskIndex(0)
    } else {
      setSelectedTaskIndex(Math.min(selectedTaskIndex + 1, maxIndex))
    }
  }, [getCurrentColumnTasks, isNavigationMode, selectedTaskIndex, setIsNavigationMode, setSelectedTaskIndex])

  const navigateUp = useCallback(() => {
    const columnTasks = getCurrentColumnTasks()
    
    if (!isNavigationMode) {
      setIsNavigationMode(true)
      setSelectedTaskIndex(Math.max(0, columnTasks.length - 1))
    } else {
      setSelectedTaskIndex(Math.max(selectedTaskIndex - 1, 0))
    }
  }, [getCurrentColumnTasks, isNavigationMode, selectedTaskIndex, setIsNavigationMode, setSelectedTaskIndex])

  const navigateLeft = useCallback(() => {
    const newColumnIndex = Math.max(selectedColumnIndex - 1, 0)
    setSelectedColumnIndex(newColumnIndex)
    
    // Reset task selection for new column
    const newColumnTasks = tasks.filter(task => task.status === COLUMN_STATUSES[newColumnIndex])
    setSelectedTaskIndex(newColumnTasks.length > 0 ? 0 : -1)
  }, [selectedColumnIndex, setSelectedColumnIndex, tasks, setSelectedTaskIndex])

  const navigateRight = useCallback(() => {
    const newColumnIndex = Math.min(selectedColumnIndex + 1, COLUMN_STATUSES.length - 1)
    setSelectedColumnIndex(newColumnIndex)
    
    // Reset task selection for new column
    const newColumnTasks = tasks.filter(task => task.status === COLUMN_STATUSES[newColumnIndex])
    setSelectedTaskIndex(newColumnTasks.length > 0 ? 0 : -1)
  }, [selectedColumnIndex, setSelectedColumnIndex, tasks, setSelectedTaskIndex])

  // Column switching handlers
  const switchToColumn = useCallback((columnIndex: number) => {
    if (columnIndex >= 0 && columnIndex < COLUMN_STATUSES.length) {
      setSelectedColumnIndex(columnIndex)
      const columnTasks = tasks.filter(task => task.status === COLUMN_STATUSES[columnIndex])
      setSelectedTaskIndex(columnTasks.length > 0 ? 0 : -1)
      setIsNavigationMode(true)
      
      // Scroll column into view
      const columnElement = document.querySelector(`[data-column-status="${COLUMN_STATUSES[columnIndex]}"]`)
      if (columnElement) {
        columnElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      
      toast.success(`Switched to ${COLUMN_STATUSES[columnIndex].replace('-', ' ')} column`)
    }
  }, [setSelectedColumnIndex, tasks, setSelectedTaskIndex, setIsNavigationMode])

  // Task action handlers
  const openSelectedTask = useCallback(() => {
    if (selectedTask) {
      // Dispatch custom event or call task detail handler
      const event = new CustomEvent('openTaskDetail', { detail: { task: selectedTask } })
      document.dispatchEvent(event)
    }
  }, [selectedTask])

  const editSelectedTask = useCallback(() => {
    if (selectedTask && onEditTask) {
      onEditTask(selectedTask)
    }
  }, [selectedTask, onEditTask])

  const deleteSelectedTask = useCallback(() => {
    if (selectedTask && onDeleteTask) {
      onDeleteTask(selectedTask)
    }
  }, [selectedTask, onDeleteTask])

  const moveSelectedTask = useCallback(async (direction: 'left' | 'right') => {
    if (!selectedTask || !onMoveTask) return

    const currentStatusIndex = COLUMN_STATUSES.indexOf(selectedTask.status)
    let newStatusIndex: number

    if (direction === 'left') {
      newStatusIndex = Math.max(currentStatusIndex - 1, 0)
    } else {
      newStatusIndex = Math.min(currentStatusIndex + 1, COLUMN_STATUSES.length - 1)
    }

    if (newStatusIndex !== currentStatusIndex) {
      const newStatus = COLUMN_STATUSES[newStatusIndex]
      try {
        await onMoveTask(selectedTask.id, newStatus)
        toast.success(`Moved task to ${newStatus.replace('-', ' ')}`)
        
        // Update selection to follow the moved task
        setSelectedColumnIndex(newStatusIndex)
        const newColumnTasks = tasks.filter(task => task.status === newStatus)
        const taskIndex = newColumnTasks.findIndex(t => t.id === selectedTask.id)
        if (taskIndex >= 0) {
          setSelectedTaskIndex(taskIndex)
        }
      } catch (error) {
        toast.error('Failed to move task')
      }
    }
  }, [selectedTask, onMoveTask, setSelectedColumnIndex, tasks, setSelectedTaskIndex])

  const duplicateSelectedTask = useCallback(() => {
    if (selectedTask) {
      // Create a copy of the task
      const duplicatedTask = {
        ...selectedTask,
        id: 0, // Will be assigned by backend
        title: `${selectedTask.title} (Copy)`,
        status: 'backlog' as TaskStatus
      }
      
      // Dispatch custom event for duplication
      const event = new CustomEvent('duplicateTask', { detail: { task: duplicatedTask } })
      document.dispatchEvent(event)
      toast.success('Task duplicated')
    }
  }, [selectedTask])

  // Select all tasks in current column
  const selectAllInColumn = useCallback(() => {
    const columnTasks = getCurrentColumnTasks()
    if (columnTasks.length > 0) {
      // Dispatch event for bulk selection
      const event = new CustomEvent('selectAllTasks', { 
        detail: { tasks: columnTasks, column: COLUMN_STATUSES[selectedColumnIndex] }
      })
      document.dispatchEvent(event)
      toast.success(`Selected ${columnTasks.length} tasks in column`)
    }
  }, [getCurrentColumnTasks, selectedColumnIndex])

  // Define kanban-specific shortcuts
  const kanbanShortcuts: KeyboardShortcut[] = [
    // Task navigation
    {
      key: 'j',
      handler: navigateDown,
      description: 'Navigate down through tasks',
      category: 'Kanban Board',
      context: ['tasks']
    },
    {
      key: 'k',
      handler: navigateUp,
      description: 'Navigate up through tasks',
      category: 'Kanban Board',
      context: ['tasks']
    },
    {
      key: 'h',
      handler: navigateLeft,
      description: 'Navigate to left column',
      category: 'Kanban Board',
      context: ['tasks']
    },
    {
      key: 'l',
      handler: navigateRight,
      description: 'Navigate to right column',
      category: 'Kanban Board',
      context: ['tasks']
    },

    // Task actions
    {
      key: 'enter',
      handler: openSelectedTask,
      description: 'Open selected task details',
      category: 'Kanban Board',
      context: ['tasks']
    },
    {
      key: 'e',
      handler: editSelectedTask,
      description: 'Edit selected task',
      category: 'Kanban Board',
      context: ['tasks']
    },
    {
      key: 'd',
      handler: deleteSelectedTask,
      description: 'Delete selected task',
      category: 'Kanban Board',
      context: ['tasks']
    },

    // Task creation
    {
      key: 'n',
      handler: () => {
        const currentStatus = COLUMN_STATUSES[selectedColumnIndex]
        onCreateTask?.(currentStatus)
      },
      description: 'Create new task in current column',
      category: 'Kanban Board',
      context: ['tasks']
    },

    // Search and filtering
    {
      key: 'f',
      handler: () => {
        onFocusSearch?.()
      },
      description: 'Focus search input',
      category: 'Kanban Board',
      context: ['tasks']
    },

    // Column switching (1-6)
    ...COLUMN_STATUSES.map((status, index) => ({
      key: (index + 1).toString(),
      handler: () => switchToColumn(index),
      description: `Switch to ${status.replace('-', ' ')} column`,
      category: 'View Switching',
      context: ['tasks']
    } as KeyboardShortcut)),

    // Advanced shortcuts
    {
      key: 'm',
      handler: () => {
        if (selectedTask) {
          // Open move dialog or cycle through statuses
          moveSelectedTask('right')
        }
      },
      description: 'Move selected task to next status',
      category: 'Advanced',
      context: ['tasks']
    },
    {
      key: 'd',
      modifiers: { ctrl: true },
      handler: duplicateSelectedTask,
      description: 'Duplicate selected task',
      category: 'Advanced',
      context: ['tasks']
    },
    {
      key: 'a',
      modifiers: { ctrl: true },
      handler: selectAllInColumn,
      description: 'Select all tasks in current column',
      category: 'Advanced',
      context: ['tasks']
    },
    {
      key: 'a',
      handler: () => {
        // Select all visible tasks
        const event = new CustomEvent('selectAllVisibleTasks', { detail: {} })
        document.dispatchEvent(event)
        toast.success('Selected all visible tasks')
      },
      description: 'Select all visible tasks',
      category: 'Advanced',
      context: ['tasks']
    },

    // Task movement with arrows
    {
      key: 'arrowleft',
      modifiers: { shift: true },
      handler: () => moveSelectedTask('left'),
      description: 'Move task to previous status',
      category: 'Advanced',
      context: ['tasks']
    },
    {
      key: 'arrowright',
      modifiers: { shift: true },
      handler: () => moveSelectedTask('right'),
      description: 'Move task to next status',
      category: 'Advanced',
      context: ['tasks']
    }
  ]

  // Register shortcuts on mount
  useEffect(() => {
    addShortcuts(kanbanShortcuts)
    
    return () => {
      removeShortcuts(kanbanShortcuts.map(s => s.key))
    }
  }, [addShortcuts, removeShortcuts])

  return {
    selectedTask,
    selectedTaskIndex,
    selectedColumnIndex,
    isNavigationMode,
    navigateDown,
    navigateUp,
    navigateLeft,
    navigateRight,
    switchToColumn,
    getCurrentColumnTasks
  }
}