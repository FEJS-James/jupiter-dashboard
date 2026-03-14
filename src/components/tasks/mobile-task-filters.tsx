'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  Calendar,
  User,
  Flag,
  Tag,
  RotateCcw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { Task, TaskPriority, TaskStatus, Project, Agent } from '@/types'
import { FilterStats } from '@/hooks/use-task-filters'

interface TaskFilters {
  search?: string
  status?: TaskStatus[]
  priority?: TaskPriority[]
  projectId?: number[]
  agentId?: number[]
  tags?: string[]
}

interface MobileTaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  onClearFilters: () => void
  filterStats: FilterStats
  tasks: Task[]
  projects: Project[]
  agents: Agent[]
  isLoading: boolean
}

const statusOptions: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: 'backlog', label: 'Backlog', color: 'bg-slate-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-emerald-500' },
  { value: 'code-review', label: 'Code Review', color: 'bg-amber-500' },
  { value: 'testing', label: 'Testing', color: 'bg-purple-500' },
  { value: 'deploying', label: 'Deploying', color: 'bg-cyan-500' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
]

export function MobileTaskFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  filterStats,
  tasks,
  projects,
  agents,
  isLoading
}: MobileTaskFiltersProps) {
  const { actualTheme } = useTheme()
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilterTab, setActiveFilterTab] = useState<'status' | 'priority' | 'project' | 'agent'>('status')
  
  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof TaskFilters]
    return value && (Array.isArray(value) ? value.length > 0 : value.toString().length > 0)
  })

  const updateFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = <K extends keyof TaskFilters>(
    key: K,
    value: any
  ) => {
    const currentArray = (filters[key] as any[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item: any) => item !== value)
      : [...currentArray, value]
    updateFilter(key, newArray as TaskFilters[K])
  }

  const uniqueTags = Array.from(new Set(tasks.flatMap(task => task.tags || [])))
    .filter(tag => tag.length > 0)
    .sort()

  const filterTabs = [
    { id: 'status', label: 'Status', icon: Flag, count: filters.status?.length || 0 },
    { id: 'priority', label: 'Priority', icon: Flag, count: filters.priority?.length || 0 },
    { id: 'project', label: 'Project', icon: Calendar, count: filters.projectId?.length || 0 },
    { id: 'agent', label: 'Agent', icon: User, count: filters.agentId?.length || 0 },
  ] as const

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className={cn(
          'absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4',
          actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        )} />
        <Input
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 pr-4 h-12 text-base"
        />
      </div>

      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center space-x-2',
            hasActiveFilters && 'border-blue-500 bg-blue-50 text-blue-700'
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {Object.values(filters).flat().filter(Boolean).length}
            </Badge>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            showFilters && 'rotate-180'
          )} />
        </Button>

        <div className="flex items-center space-x-2 text-sm">
          <span className={cn(
            'text-slate-500',
            actualTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          )}>
            {filterStats.filteredTasks} of {filterStats.totalTasks} tasks
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'border rounded-lg overflow-hidden',
              actualTheme === 'dark' 
                ? 'border-slate-700 bg-slate-800/50' 
                : 'border-slate-200 bg-slate-50/50'
            )}
          >
            {/* Filter Tabs */}
            <div className="flex overflow-x-auto p-2 gap-1 border-b border-slate-200 dark:border-slate-700">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                    activeFilterTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : actualTheme === 'dark'
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-slate-700 hover:bg-slate-200'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Filter Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                {activeFilterTab === 'status' && (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleArrayFilter('status', option.value)}
                        className={cn(
                          'flex items-center space-x-2 p-3 rounded-lg border text-left transition-colors',
                          filters.status?.includes(option.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-600 hover:bg-slate-700'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn('w-3 h-3 rounded-full', option.color)} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-slate-500 ml-auto">
                          {filterStats.statusCounts[option.value] || 0}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {activeFilterTab === 'priority' && (
                  <motion.div
                    key="priority"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleArrayFilter('priority', option.value)}
                        className={cn(
                          'flex items-center space-x-2 p-3 rounded-lg border text-left transition-colors',
                          filters.priority?.includes(option.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-600 hover:bg-slate-700'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn('w-3 h-3 rounded-full', option.color)} />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-slate-500 ml-auto">
                          {filterStats.priorityCounts[option.value] || 0}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {activeFilterTab === 'project' && (
                  <motion.div
                    key="project"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => toggleArrayFilter('projectId', project.id)}
                        className={cn(
                          'flex items-center justify-between w-full p-3 rounded-lg border text-left transition-colors',
                          filters.projectId?.includes(project.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-600 hover:bg-slate-700'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <span className="text-sm font-medium">{project.name}</span>
                        <span className="text-xs text-slate-500">
                          {tasks.filter(task => task.projectId === project.id).length}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {activeFilterTab === 'agent' && (
                  <motion.div
                    key="agent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <button
                      onClick={() => toggleArrayFilter('agentId', null)}
                      className={cn(
                        'flex items-center justify-between w-full p-3 rounded-lg border text-left transition-colors',
                        filters.agentId?.includes(null as any)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : actualTheme === 'dark'
                            ? 'border-slate-600 hover:bg-slate-700'
                            : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-sm font-medium">Unassigned</span>
                      <span className="text-xs text-slate-500">
                        {tasks.filter(task => !task.agent?.id).length}
                      </span>
                    </button>
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => toggleArrayFilter('agentId', agent.id)}
                        className={cn(
                          'flex items-center justify-between w-full p-3 rounded-lg border text-left transition-colors',
                          filters.agentId?.includes(agent.id)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-600 hover:bg-slate-700'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{agent.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {tasks.filter(task => task.agent?.id === agent.id).length}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge 
              variant="outline" 
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              <Search className="h-3 w-3" />
              "{filters.search}"
              <button 
                onClick={() => updateFilter('search', '')}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.status?.map((status) => (
            <Badge 
              key={status} 
              variant="outline"
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              <Flag className="h-3 w-3" />
              {statusOptions.find(s => s.value === status)?.label}
              <button 
                onClick={() => toggleArrayFilter('status', status)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.priority?.map((priority) => (
            <Badge 
              key={priority} 
              variant="outline"
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              <Flag className="h-3 w-3" />
              {priorityOptions.find(p => p.value === priority)?.label}
              <button 
                onClick={() => toggleArrayFilter('priority', priority)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}