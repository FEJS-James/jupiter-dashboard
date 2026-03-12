'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyboardShortcut } from './use-keyboard-shortcuts'
import { useKeyboardShortcutsContext } from '@/contexts/keyboard-shortcuts-context'
import { Task, Agent } from '@/types'
import { toast } from 'sonner'

interface UseTaskManagementShortcutsOptions {
  tasks?: Task[]
  agents?: Agent[]
  onSaveTask?: () => void
  onCancelForm?: () => void
  onOpenCommandPalette?: () => void
  onOpenAssignmentDialog?: () => void
  onUndo?: () => void
  onRedo?: () => void
  isFormOpen?: boolean
}

export function useTaskManagementShortcuts({
  tasks = [],
  agents = [],
  onSaveTask,
  onCancelForm,
  onOpenCommandPalette,
  onOpenAssignmentDialog,
  onUndo,
  onRedo,
  isFormOpen = false
}: UseTaskManagementShortcutsOptions) {
  const {
    addShortcuts,
    removeShortcuts,
    setShowHelp
  } = useKeyboardShortcutsContext()

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [recentActions, setRecentActions] = useState<string[]>([])

  // Form navigation helpers
  const navigateToNextField = useCallback(() => {
    const formElements = document.querySelectorAll(
      'input:not([type="hidden"]), textarea, select, button'
    ) as NodeListOf<HTMLElement>
    
    const currentElement = document.activeElement as HTMLElement
    const currentIndex = Array.from(formElements).indexOf(currentElement)
    
    if (currentIndex >= 0 && currentIndex < formElements.length - 1) {
      formElements[currentIndex + 1].focus()
    } else if (formElements.length > 0) {
      formElements[0].focus()
    }
  }, [])

  const navigateToPrevField = useCallback(() => {
    const formElements = document.querySelectorAll(
      'input:not([type="hidden"]), textarea, select, button'
    ) as NodeListOf<HTMLElement>
    
    const currentElement = document.activeElement as HTMLElement
    const currentIndex = Array.from(formElements).indexOf(currentElement)
    
    if (currentIndex > 0) {
      formElements[currentIndex - 1].focus()
    } else if (formElements.length > 0) {
      formElements[formElements.length - 1].focus()
    }
  }, [])

  // Command palette functionality
  const handleCommandPalette = useCallback(() => {
    setCommandPaletteOpen(!commandPaletteOpen)
    onOpenCommandPalette?.()
  }, [commandPaletteOpen, onOpenCommandPalette])

  // Priority cycling for selected task
  const cyclePriority = useCallback(() => {
    const priorities = ['low', 'medium', 'high', 'critical']
    // This would interact with the selected task
    const event = new CustomEvent('cyclePriority', { 
      detail: { priorities } 
    })
    document.dispatchEvent(event)
    toast.success('Priority changed')
  }, [])

  // Assignment dialog handler
  const handleAssignment = useCallback(() => {
    if (agents.length === 0) {
      toast.error('No agents available')
      return
    }
    onOpenAssignmentDialog?.()
  }, [agents.length, onOpenAssignmentDialog])

  // Quick actions for productivity
  const quickCreateTask = useCallback(() => {
    // Focus the quick create input if it exists
    const quickCreateInput = document.querySelector('[data-quick-create="true"]') as HTMLInputElement
    if (quickCreateInput) {
      quickCreateInput.focus()
      toast.success('Quick create mode')
    } else {
      // Fallback to regular create task
      const event = new CustomEvent('createTask', { detail: { quick: true } })
      document.dispatchEvent(event)
    }
  }, [])

  // View switching handlers
  const switchToListView = useCallback(() => {
    const event = new CustomEvent('switchView', { detail: { view: 'list' } })
    document.dispatchEvent(event)
    toast.success('Switched to list view')
  }, [])

  const switchToKanbanView = useCallback(() => {
    const event = new CustomEvent('switchView', { detail: { view: 'kanban' } })
    document.dispatchEvent(event)
    toast.success('Switched to kanban view')
  }, [])

  const switchToCalendarView = useCallback(() => {
    const event = new CustomEvent('switchView', { detail: { view: 'calendar' } })
    document.dispatchEvent(event)
    toast.success('Switched to calendar view')
  }, [])

  // Settings shortcut
  const openSettings = useCallback(() => {
    const event = new CustomEvent('openSettings', { detail: {} })
    document.dispatchEvent(event)
  }, [])

  // Action history tracking
  const addToRecentActions = useCallback((action: string) => {
    setRecentActions(prev => [action, ...prev.slice(0, 9)]) // Keep last 10 actions
  }, [])

  // Define task management shortcuts
  const taskManagementShortcuts: KeyboardShortcut[] = [
    // Form shortcuts (only when form is open)
    {
      key: 'enter',
      modifiers: { ctrl: true },
      handler: () => {
        if (isFormOpen && onSaveTask) {
          onSaveTask()
          addToRecentActions('Task saved')
        }
      },
      description: 'Save task (in forms)',
      category: 'Task Management',
      context: ['tasks']
    },
    {
      key: 'escape',
      handler: () => {
        if (isFormOpen && onCancelForm) {
          onCancelForm()
        }
      },
      description: 'Cancel form',
      category: 'Task Management'
    },
    {
      key: 'tab',
      handler: navigateToNextField,
      description: 'Next form field',
      category: 'Task Management',
      preventDefault: false // Let browser handle default tab behavior in most cases
    },
    {
      key: 'tab',
      modifiers: { shift: true },
      handler: navigateToPrevField,
      description: 'Previous form field',
      category: 'Task Management',
      preventDefault: false
    },

    // Command palette
    {
      key: 'k',
      modifiers: { ctrl: true },
      handler: handleCommandPalette,
      description: 'Open command palette',
      category: 'Task Management'
    },

    // Quick actions
    {
      key: 'q',
      handler: quickCreateTask,
      description: 'Quick create task',
      category: 'Task Management',
      context: ['tasks']
    },
    {
      key: 'p',
      handler: cyclePriority,
      description: 'Change priority of selected task',
      category: 'Task Management',
      context: ['tasks']
    },
    {
      key: '@',
      handler: handleAssignment,
      description: 'Assign selected task to agent',
      category: 'Task Management',
      context: ['tasks']
    },

    // View switching
    {
      key: 'v + l',
      handler: switchToListView,
      description: 'Switch to list view',
      category: 'View Switching',
      context: ['tasks']
    },
    {
      key: 'v + k',
      handler: switchToKanbanView,
      description: 'Switch to kanban view',
      category: 'View Switching',
      context: ['tasks']
    },
    {
      key: 'v + c',
      handler: switchToCalendarView,
      description: 'Switch to calendar view',
      category: 'View Switching',
      context: ['tasks']
    },

    // Undo/Redo (if supported by the app)
    {
      key: 'z',
      modifiers: { ctrl: true },
      handler: () => {
        if (onUndo) {
          onUndo()
          toast.success('Action undone')
        } else {
          toast.error('Undo not available')
        }
      },
      description: 'Undo last action',
      category: 'Advanced'
    },
    {
      key: 'y',
      modifiers: { ctrl: true },
      handler: () => {
        if (onRedo) {
          onRedo()
          toast.success('Action redone')
        } else {
          toast.error('Redo not available')
        }
      },
      description: 'Redo action',
      category: 'Advanced'
    },

    // Settings
    {
      key: ',',
      modifiers: { ctrl: true },
      handler: openSettings,
      description: 'Open preferences/settings',
      category: 'General'
    },

    // Focus management
    {
      key: 'i',
      handler: () => {
        // Focus first input on the page
        const firstInput = document.querySelector('input, textarea') as HTMLElement
        if (firstInput) {
          firstInput.focus()
          toast.success('Focused input')
        }
      },
      description: 'Focus first input field',
      category: 'General'
    },

    // Toggle sidebar (if applicable)
    {
      key: 'b',
      modifiers: { ctrl: true },
      handler: () => {
        const event = new CustomEvent('toggleSidebar', { detail: {} })
        document.dispatchEvent(event)
      },
      description: 'Toggle sidebar',
      category: 'General'
    },

    // Export/Import shortcuts
    {
      key: 'e',
      modifiers: { ctrl: true, shift: true },
      handler: () => {
        const event = new CustomEvent('exportTasks', { detail: {} })
        document.dispatchEvent(event)
        toast.success('Exporting tasks...')
      },
      description: 'Export tasks',
      category: 'Advanced',
      context: ['tasks']
    },

    // Refresh data
    {
      key: 'r',
      modifiers: { ctrl: true },
      handler: () => {
        const event = new CustomEvent('refreshData', { detail: {} })
        document.dispatchEvent(event)
        toast.success('Refreshing data...')
      },
      description: 'Refresh data',
      category: 'General'
    },

    // Toggle theme
    {
      key: 't',
      modifiers: { ctrl: true },
      handler: () => {
        const event = new CustomEvent('toggleTheme', { detail: {} })
        document.dispatchEvent(event)
      },
      description: 'Toggle theme',
      category: 'General'
    }
  ]

  // Register shortcuts on mount
  useEffect(() => {
    addShortcuts(taskManagementShortcuts)
    
    return () => {
      removeShortcuts(taskManagementShortcuts.map(s => s.key))
    }
  }, [addShortcuts, removeShortcuts, isFormOpen])

  return {
    commandPaletteOpen,
    setCommandPaletteOpen,
    recentActions,
    navigateToNextField,
    navigateToPrevField,
    handleCommandPalette,
    cyclePriority,
    handleAssignment,
    quickCreateTask,
    addToRecentActions
  }
}