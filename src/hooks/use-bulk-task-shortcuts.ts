'use client'

import { useEffect } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { useBulkTasks } from '@/contexts/bulk-task-context'

interface UseBulkTaskShortcutsOptions {
  tasks: Task[]
  onBulkMove?: (taskIds: number[], status: TaskStatus) => void
  onBulkPriority?: (taskIds: number[], priority: TaskPriority) => void
  onBulkDelete?: (taskIds: number[]) => void
  enabled?: boolean
}

export function useBulkTaskShortcuts({
  tasks,
  onBulkMove,
  onBulkPriority,
  onBulkDelete,
  enabled = true,
}: UseBulkTaskShortcutsOptions) {
  const {
    selectedTasks,
    selectedCount,
    selectAll,
    clearSelection,
    isSelectMode,
    setSelectMode,
  } = useBulkTasks()

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if we have focus on the board area
      const target = event.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      
      if (isInputFocused) return

      // Handle keyboard shortcuts
      const { key, ctrlKey, metaKey, shiftKey, altKey } = event
      const cmdOrCtrl = ctrlKey || metaKey

      // Prevent default for handled shortcuts
      let handled = false

      switch (key.toLowerCase()) {
        // Selection shortcuts
        case 'a':
          if (cmdOrCtrl) {
            event.preventDefault()
            handled = true
            if (selectedCount === tasks.length && tasks.length > 0) {
              clearSelection()
            } else {
              selectAll(tasks)
            }
          }
          break

        case 's':
          if (cmdOrCtrl) {
            event.preventDefault()
            handled = true
            setSelectMode(!isSelectMode)
          }
          break

        case 'escape':
          if (isSelectMode) {
            event.preventDefault()
            handled = true
            clearSelection()
            setSelectMode(false)
          }
          break

        // Status movement shortcuts (only when tasks are selected)
        case '1':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'backlog')
          }
          break

        case '2':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'in-progress')
          }
          break

        case '3':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'code-review')
          }
          break

        case '4':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'testing')
          }
          break

        case '5':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'deploying')
          }
          break

        case '6':
          if (altKey && selectedCount > 0) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkMove?.(taskIds, 'done')
          }
          break

        // Priority shortcuts (only when tasks are selected)
        case 'p':
          if (cmdOrCtrl && selectedCount > 0) {
            event.preventDefault()
            handled = true
            
            if (shiftKey) {
              // Ctrl+Shift+P = Urgent
              const taskIds = selectedTasks.map(t => t.id)
              onBulkPriority?.(taskIds, 'urgent')
            } else if (altKey) {
              // Ctrl+Alt+P = Low
              const taskIds = selectedTasks.map(t => t.id)
              onBulkPriority?.(taskIds, 'low')
            } else {
              // Ctrl+P = High
              const taskIds = selectedTasks.map(t => t.id)
              onBulkPriority?.(taskIds, 'high')
            }
          }
          break

        case 'm':
          if (cmdOrCtrl && selectedCount > 0) {
            event.preventDefault()
            handled = true
            // Ctrl+M = Medium priority
            const taskIds = selectedTasks.map(t => t.id)
            onBulkPriority?.(taskIds, 'medium')
          }
          break

        // Delete shortcut (with confirmation)
        case 'delete':
        case 'backspace':
          if (selectedCount > 0 && (cmdOrCtrl || shiftKey)) {
            event.preventDefault()
            handled = true
            const taskIds = selectedTasks.map(t => t.id)
            onBulkDelete?.(taskIds)
          }
          break
      }

      if (handled) {
        event.stopPropagation()
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enabled,
    tasks,
    selectedTasks,
    selectedCount,
    isSelectMode,
    selectAll,
    clearSelection,
    setSelectMode,
    onBulkMove,
    onBulkPriority,
    onBulkDelete,
  ])

  // Return helpful information about available shortcuts
  const shortcuts = {
    selection: [
      { keys: ['Ctrl/Cmd', 'A'], description: 'Select all tasks' },
      { keys: ['Ctrl/Cmd', 'S'], description: 'Toggle selection mode' },
      { keys: ['Escape'], description: 'Clear selection & exit select mode' },
    ],
    movement: [
      { keys: ['Alt', '1'], description: 'Move to Backlog' },
      { keys: ['Alt', '2'], description: 'Move to In Progress' },
      { keys: ['Alt', '3'], description: 'Move to Code Review' },
      { keys: ['Alt', '4'], description: 'Move to Testing' },
      { keys: ['Alt', '5'], description: 'Move to Deploying' },
      { keys: ['Alt', '6'], description: 'Move to Done' },
    ],
    priority: [
      { keys: ['Ctrl/Cmd', 'M'], description: 'Set Medium priority' },
      { keys: ['Ctrl/Cmd', 'P'], description: 'Set High priority' },
      { keys: ['Ctrl/Cmd', 'Shift', 'P'], description: 'Set Urgent priority' },
      { keys: ['Ctrl/Cmd', 'Alt', 'P'], description: 'Set Low priority' },
    ],
    actions: [
      { keys: ['Ctrl/Cmd', 'Delete'], description: 'Delete selected tasks' },
      { keys: ['Shift', 'Delete'], description: 'Delete selected tasks' },
    ],
  }

  return {
    shortcuts,
    selectedCount,
    isSelectMode,
  }
}