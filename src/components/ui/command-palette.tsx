'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useKeyboardShortcutsContext } from '@/contexts/keyboard-shortcuts-context'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Search, 
  Navigation, 
  MousePointer, 
  Settings, 
  Zap, 
  Keyboard, 
  Globe,
  Plus,
  Edit,
  Trash2,
  Move,
  Copy,
  Eye,
  Filter,
  RefreshCw,
  Moon,
  Sun,
  Palette,
  User,
  Clock,
  Calendar,
  BarChart3,
  Bell,
  Home,
  FolderOpen,
  Users,
  Activity,
  Download,
  Upload
} from 'lucide-react'
import { Task, TaskStatus, Agent } from '@/types'
import { toast } from 'sonner'

interface CommandPaletteAction {
  id: string
  title: string
  description?: string
  category: string
  keywords: string[]
  icon?: React.ReactNode
  action: () => void
  shortcut?: string
  context?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks?: Task[]
  agents?: Agent[]
  currentTask?: Task | null
}

export function CommandPalette({ 
  open, 
  onOpenChange, 
  tasks = [], 
  agents = [],
  currentTask 
}: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { shortcuts, currentContext } = useKeyboardShortcutsContext()
  const [query, setQuery] = useState('')

  // Generate actions from shortcuts and app functionality
  const actions = useMemo((): CommandPaletteAction[] => {
    const shortcutActions: CommandPaletteAction[] = shortcuts.map(shortcut => ({
      id: `shortcut-${shortcut.key}`,
      title: shortcut.description,
      category: shortcut.category,
      keywords: [shortcut.description.toLowerCase(), shortcut.key, shortcut.category.toLowerCase()],
      action: shortcut.handler,
      shortcut: shortcut.key,
      context: shortcut.context
    }))

    // Navigation actions
    const navigationActions: CommandPaletteAction[] = [
      {
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        category: 'Navigation',
        keywords: ['dashboard', 'home', 'main'],
        icon: <Home className="w-4 h-4" />,
        action: () => {
          router.push('/')
          toast.success('Navigated to Dashboard')
        },
        shortcut: 'g + d'
      },
      {
        id: 'nav-tasks',
        title: 'Go to Tasks Board',
        description: 'Navigate to the kanban board',
        category: 'Navigation',
        keywords: ['tasks', 'kanban', 'board'],
        icon: <MousePointer className="w-4 h-4" />,
        action: () => {
          router.push('/tasks')
          toast.success('Navigated to Tasks Board')
        },
        shortcut: 'g + b'
      },
      {
        id: 'nav-projects',
        title: 'Go to Projects',
        description: 'Navigate to project management',
        category: 'Navigation',
        keywords: ['projects', 'manage'],
        icon: <FolderOpen className="w-4 h-4" />,
        action: () => {
          router.push('/projects')
          toast.success('Navigated to Projects')
        },
        shortcut: 'g + p'
      },
      {
        id: 'nav-analytics',
        title: 'Go to Analytics',
        description: 'Navigate to analytics dashboard',
        category: 'Navigation',
        keywords: ['analytics', 'metrics', 'stats'],
        icon: <BarChart3 className="w-4 h-4" />,
        action: () => {
          router.push('/analytics')
          toast.success('Navigated to Analytics')
        },
        shortcut: 'g + a'
      },
      {
        id: 'nav-agents',
        title: 'Go to Agents',
        description: 'Navigate to agent management',
        category: 'Navigation',
        keywords: ['agents', 'users', 'team'],
        icon: <Users className="w-4 h-4" />,
        action: () => {
          router.push('/agents')
          toast.success('Navigated to Agents')
        }
      },
      {
        id: 'nav-notifications',
        title: 'Go to Notifications',
        description: 'Navigate to notifications center',
        category: 'Navigation',
        keywords: ['notifications', 'alerts', 'messages'],
        icon: <Bell className="w-4 h-4" />,
        action: () => {
          router.push('/notifications')
          toast.success('Navigated to Notifications')
        },
        shortcut: 'g + n'
      },
      {
        id: 'nav-activity',
        title: 'Go to Activity Feed',
        description: 'Navigate to activity timeline',
        category: 'Navigation',
        keywords: ['activity', 'feed', 'timeline', 'history'],
        icon: <Activity className="w-4 h-4" />,
        action: () => {
          router.push('/activity')
          toast.success('Navigated to Activity')
        }
      }
    ]

    // Task actions (context-dependent)
    const taskActions: CommandPaletteAction[] = [
      {
        id: 'create-task',
        title: 'Create New Task',
        description: 'Create a new task in the current column',
        category: 'Task Management',
        keywords: ['create', 'new', 'task', 'add'],
        icon: <Plus className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('createTask', { detail: {} })
          document.dispatchEvent(event)
          toast.success('Creating new task...')
        },
        shortcut: 'n',
        context: ['tasks']
      },
      ...(currentTask ? [
        {
          id: 'edit-current-task',
          title: `Edit "${currentTask.title}"`,
          description: 'Edit the currently selected task',
          category: 'Task Management',
          keywords: ['edit', 'modify', 'update', 'current', 'selected'],
          icon: <Edit className="w-4 h-4" />,
          action: () => {
            const event = new CustomEvent('editTask', { detail: { task: currentTask } })
            document.dispatchEvent(event)
            toast.success('Editing task...')
          },
          shortcut: 'e',
          context: ['tasks']
        },
        {
          id: 'delete-current-task',
          title: `Delete "${currentTask.title}"`,
          description: 'Delete the currently selected task',
          category: 'Task Management',
          keywords: ['delete', 'remove', 'current', 'selected'],
          icon: <Trash2 className="w-4 h-4" />,
          action: () => {
            const event = new CustomEvent('deleteTask', { detail: { task: currentTask } })
            document.dispatchEvent(event)
            toast.success('Deleting task...')
          },
          shortcut: 'd',
          context: ['tasks']
        },
        {
          id: 'duplicate-current-task',
          title: `Duplicate "${currentTask.title}"`,
          description: 'Create a copy of the current task',
          category: 'Task Management',
          keywords: ['duplicate', 'copy', 'clone', 'current', 'selected'],
          icon: <Copy className="w-4 h-4" />,
          action: () => {
            const event = new CustomEvent('duplicateTask', { detail: { task: currentTask } })
            document.dispatchEvent(event)
            toast.success('Task duplicated')
          },
          shortcut: 'Ctrl + d',
          context: ['tasks']
        }
      ] : []),
      
      // Quick task navigation
      ...tasks.slice(0, 10).map((task, index) => ({
        id: `task-${task.id}`,
        title: `Open "${task.title}"`,
        description: `Status: ${task.status} | Priority: ${task.priority}`,
        category: 'Quick Access',
        keywords: [task.title.toLowerCase(), task.status, task.priority || 'normal'],
        icon: <Eye className="w-4 h-4" />,
        action: () => {
          router.push(`/tasks/${task.id}`)
          toast.success(`Opened task: ${task.title}`)
        }
      }))
    ]

    // View and filter actions
    const viewActions: CommandPaletteAction[] = [
      {
        id: 'view-kanban',
        title: 'Switch to Kanban View',
        category: 'View Switching',
        keywords: ['kanban', 'board', 'view'],
        icon: <MousePointer className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('switchView', { detail: { view: 'kanban' } })
          document.dispatchEvent(event)
        },
        shortcut: 'v + k',
        context: ['tasks']
      },
      {
        id: 'view-list',
        title: 'Switch to List View',
        category: 'View Switching',
        keywords: ['list', 'table', 'view'],
        icon: <Filter className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('switchView', { detail: { view: 'list' } })
          document.dispatchEvent(event)
        },
        shortcut: 'v + l',
        context: ['tasks']
      },
      {
        id: 'view-calendar',
        title: 'Switch to Calendar View',
        category: 'View Switching',
        keywords: ['calendar', 'timeline', 'view'],
        icon: <Calendar className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('switchView', { detail: { view: 'calendar' } })
          document.dispatchEvent(event)
        },
        shortcut: 'v + c',
        context: ['tasks']
      },
      {
        id: 'focus-search',
        title: 'Focus Search',
        description: 'Focus the search input to filter tasks',
        category: 'View Switching',
        keywords: ['search', 'filter', 'find'],
        icon: <Search className="w-4 h-4" />,
        action: () => {
          const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            toast.success('Search focused')
          }
        },
        shortcut: 'f',
        context: ['tasks']
      }
    ]

    // System actions
    const systemActions: CommandPaletteAction[] = [
      {
        id: 'toggle-theme',
        title: 'Toggle Theme',
        description: 'Switch between light and dark theme',
        category: 'General',
        keywords: ['theme', 'dark', 'light', 'mode'],
        icon: <Palette className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('toggleTheme', { detail: {} })
          document.dispatchEvent(event)
        },
        shortcut: 'Ctrl + t'
      },
      {
        id: 'refresh-data',
        title: 'Refresh Data',
        description: 'Reload all data from the server',
        category: 'General',
        keywords: ['refresh', 'reload', 'sync'],
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('refreshData', { detail: {} })
          document.dispatchEvent(event)
        },
        shortcut: 'Ctrl + r'
      },
      {
        id: 'export-tasks',
        title: 'Export Tasks',
        description: 'Export tasks to file',
        category: 'Advanced',
        keywords: ['export', 'download', 'backup'],
        icon: <Download className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('exportTasks', { detail: {} })
          document.dispatchEvent(event)
        },
        shortcut: 'Ctrl + Shift + e',
        context: ['tasks']
      },
      {
        id: 'show-shortcuts',
        title: 'Show Keyboard Shortcuts',
        description: 'Display the keyboard shortcuts help',
        category: 'Help',
        keywords: ['shortcuts', 'help', 'keys'],
        icon: <Keyboard className="w-4 h-4" />,
        action: () => {
          const event = new CustomEvent('showShortcuts', { detail: {} })
          document.dispatchEvent(event)
        },
        shortcut: '?'
      }
    ]

    return [
      ...navigationActions,
      ...taskActions,
      ...viewActions,
      ...systemActions
    ]
  }, [shortcuts, router, tasks, currentTask, pathname, currentContext])

  // Filter actions based on query and context
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions

    const searchTerms = query.toLowerCase().split(' ').filter(Boolean)
    
    return actions.filter(action => {
      // Check if action is relevant to current context
      if (action.context && !action.context.includes(currentContext)) {
        return false
      }

      // Check if any search term matches
      return searchTerms.every(term =>
        action.title.toLowerCase().includes(term) ||
        action.description?.toLowerCase().includes(term) ||
        action.keywords.some(keyword => keyword.includes(term)) ||
        action.category.toLowerCase().includes(term)
      )
    })
  }, [actions, query, currentContext])

  // Group filtered actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, typeof actions> = {}
    
    filteredActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = []
      }
      groups[action.category].push(action)
    })
    
    return groups
  }, [filteredActions])

  // Handle action selection
  const handleSelect = useCallback((action: CommandPaletteAction) => {
    onOpenChange(false)
    setQuery('')
    action.action()
  }, [onOpenChange])

  // Clear query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  const categoryIcons = {
    Navigation: <Globe className="w-4 h-4" />,
    'Task Management': <Settings className="w-4 h-4" />,
    'View Switching': <Zap className="w-4 h-4" />,
    'Quick Access': <Eye className="w-4 h-4" />,
    Advanced: <Keyboard className="w-4 h-4" />,
    General: <Settings className="w-4 h-4" />,
    Help: <Search className="w-4 h-4" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <Command className="rounded-lg border-0 shadow-lg">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Type to search actions..."
              value={query}
              onValueChange={setQuery}
              className="border-0 focus:ring-0"
            />
            <Badge variant="secondary" className="ml-2 text-xs">
              {currentContext || 'global'}
            </Badge>
          </div>
          
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              No actions found for "{query}"
            </CommandEmpty>
            
            {Object.entries(groupedActions).map(([category, categoryActions]) => (
              <React.Fragment key={category}>
                <CommandGroup 
                  heading={
                    <div className="flex items-center gap-2">
                      {categoryIcons[category as keyof typeof categoryIcons]}
                      {category}
                    </div>
                  }
                >
                  {categoryActions.map((action) => (
                    <CommandItem
                      key={action.id}
                      value={action.id}
                      onSelect={() => handleSelect(action)}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        {action.icon}
                        <div className="flex flex-col">
                          <span className="font-medium">{action.title}</span>
                          {action.description && (
                            <span className="text-xs text-muted-foreground">
                              {action.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {action.shortcut && (
                        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-xs font-mono font-medium text-muted-foreground opacity-100">
                          {action.shortcut}
                        </kbd>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}