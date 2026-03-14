'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp,
  Users, 
  FolderOpen, 
  AlertCircle,
  BarChart3,
  Clock,
  Tag as TagIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { TaskFilters, FilterStats } from '@/hooks/use-task-filters'
import { Task, TaskStatus, TaskPriority, Project, Agent } from '@/types'

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  onClearFilters: () => void
  filterStats: FilterStats
  tasks: Task[]
  projects: Project[]
  agents: Agent[]
  isLoading?: boolean
}

const statusConfig = [
  { value: 'backlog', label: 'Backlog', color: '#64748b' },
  { value: 'in-progress', label: 'In Progress', color: '#10b981' },
  { value: 'code-review', label: 'Code Review', color: '#f59e0b' },
  { value: 'testing', label: 'Testing', color: '#8b5cf6' },
  { value: 'deploying', label: 'Deploying', color: '#06b6d4' },
  { value: 'done', label: 'Done', color: '#059669' },
  { value: 'blocked', label: 'Blocked', color: '#ef4444' }
] as const

const priorityConfig = [
  { value: 'low', label: 'Low', color: '#64748b' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626' }
] as const

interface MultiSelectFilterProps {
  title: string
  icon: React.ReactNode
  values: string[]
  onValuesChange: (values: string[]) => void
  options: Array<{
    value: string
    label: string
    color?: string
    count?: number
  }>
  placeholder: string
}

function MultiSelectFilter({ 
  title, 
  icon, 
  values, 
  onValuesChange, 
  options, 
  placeholder 
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = (value: string) => {
    const newValues = values.includes(value)
      ? values.filter(v => v !== value)
      : [...values, value]
    onValuesChange(newValues)
  }

  const selectedCount = values.length
  const selectedLabels = options
    .filter(opt => values.includes(opt.value))
    .map(opt => opt.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600",
            selectedCount > 0 && "border-blue-500 bg-blue-950/20"
          )}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="truncate">
              {selectedCount === 0 
                ? placeholder
                : selectedCount === 1 
                  ? selectedLabels[0]
                  : `${selectedCount} selected`
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            {selectedCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs bg-blue-600">
                {selectedCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-800 border-slate-600" align="start">
        <Command className="bg-slate-800">
          <CommandInput 
            placeholder={`Search ${title.toLowerCase()}...`}
            className="bg-slate-800 border-slate-600"
          />
          <CommandList>
            <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[200px]">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleToggle(option.value)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-700"
                  >
                    <Checkbox
                      checked={values.includes(option.value)}
                      onCheckedChange={() => handleToggle(option.value)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {option.color && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="flex-1">{option.label}</span>
                      {option.count !== undefined && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function TaskFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  filterStats,
  tasks,
  projects,
  agents,
  isLoading = false
}: TaskFiltersProps) {
  const hasActiveFilters = filters.search || 
    filters.statuses.length > 0 || 
    filters.priorities.length > 0 || 
    filters.assignees.length > 0 || 
    filters.projectIds.length > 0 || 
    filters.tags.length > 0

  // Get unique tags from all tasks
  const allTags = Array.from(new Set(
    tasks.flatMap(task => Array.isArray(task.tags) ? task.tags : [])
  )).sort()

  const statusOptions = statusConfig.map(status => ({
    value: status.value,
    label: status.label,
    color: status.color,
    count: filterStats.statusCounts[status.value as TaskStatus]
  }))

  const priorityOptions = priorityConfig.map(priority => ({
    value: priority.value,
    label: priority.label,
    color: priority.color,
    count: filterStats.priorityCounts[priority.value as TaskPriority]
  }))

  const projectOptions = projects.map(project => ({
    value: project.id.toString(),
    label: project.name,
    count: filterStats.projectCounts[project.id]
  }))

  const assigneeOptions = agents.map(agent => ({
    value: agent.name,
    label: agent.name,
    color: agent.color,
    count: filterStats.assigneeCounts[agent.name]
  }))

  const tagOptions = allTags.map(tag => ({
    value: tag,
    label: tag,
    count: tasks.filter(task => Array.isArray(task.tags) && task.tags.includes(tag)).length
  }))

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
            {isLoading && (
              <div 
                role="status" 
                aria-label="Loading filters"
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" 
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" />
            <span>{filterStats.filteredTasks} of {filterStats.totalTasks} tasks</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Tasks
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search in title and description..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-100 focus:border-blue-500"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => onFiltersChange({ search: '' })}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Multi-select Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Status</Label>
            <MultiSelectFilter
              title="Status"
              icon={<Clock className="w-4 h-4" />}
              values={filters.statuses}
              onValuesChange={(statuses) => onFiltersChange({ statuses: statuses as TaskStatus[] })}
              options={statusOptions}
              placeholder="All statuses"
            />
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Priority</Label>
            <MultiSelectFilter
              title="Priority"
              icon={<AlertCircle className="w-4 h-4" />}
              values={filters.priorities}
              onValuesChange={(priorities) => onFiltersChange({ priorities: priorities as TaskPriority[] })}
              options={priorityOptions}
              placeholder="All priorities"
            />
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Assignee</Label>
            <MultiSelectFilter
              title="Assignee"
              icon={<Users className="w-4 h-4" />}
              values={filters.assignees}
              onValuesChange={(assignees) => onFiltersChange({ assignees })}
              options={assigneeOptions}
              placeholder="All assignees"
            />
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Project</Label>
            <MultiSelectFilter
              title="Project"
              icon={<FolderOpen className="w-4 h-4" />}
              values={filters.projectIds.map(id => id.toString())}
              onValuesChange={(projectIds) => onFiltersChange({ 
                projectIds: projectIds.map(id => parseInt(id)).filter(id => !isNaN(id))
              })}
              options={projectOptions}
              placeholder="All projects"
            />
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">Tags</Label>
              <MultiSelectFilter
                title="Tags"
                icon={<TagIcon className="w-4 h-4" />}
                values={filters.tags}
                onValuesChange={(tags) => onFiltersChange({ tags })}
                options={tagOptions}
                placeholder="All tags"
              />
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <>
            <Separator className="bg-slate-700" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-300">Active Filters</Label>
                <Button
                  onClick={onClearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-200 h-6"
                >
                  Clear all
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-900/30 text-blue-200 border-blue-700 flex items-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    "{filters.search}"
                    <button
                      onClick={() => onFiltersChange({ search: '' })}
                      className="ml-1 hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                
                {filters.statuses.map(status => (
                  <Badge 
                    key={status} 
                    variant="secondary"
                    className="bg-green-900/30 text-green-200 border-green-700 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    {statusConfig.find(s => s.value === status)?.label}
                    <button
                      onClick={() => onFiltersChange({ 
                        statuses: filters.statuses.filter(s => s !== status)
                      })}
                      className="ml-1 hover:bg-green-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                
                {filters.priorities.map(priority => (
                  <Badge 
                    key={priority} 
                    variant="secondary"
                    className="bg-yellow-900/30 text-yellow-200 border-yellow-700 flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {priorityConfig.find(p => p.value === priority)?.label}
                    <button
                      onClick={() => onFiltersChange({ 
                        priorities: filters.priorities.filter(p => p !== priority)
                      })}
                      className="ml-1 hover:bg-yellow-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                
                {filters.assignees.map(assignee => (
                  <Badge 
                    key={assignee} 
                    variant="secondary"
                    className="bg-purple-900/30 text-purple-200 border-purple-700 flex items-center gap-1"
                  >
                    <Users className="w-3 h-3" />
                    {assignee}
                    <button
                      onClick={() => onFiltersChange({ 
                        assignees: filters.assignees.filter(a => a !== assignee)
                      })}
                      className="ml-1 hover:bg-purple-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}

                {filters.projectIds.map(projectId => {
                  const project = projects.find(p => p.id === projectId)
                  return project ? (
                    <Badge 
                      key={projectId} 
                      variant="secondary"
                      className="bg-cyan-900/30 text-cyan-200 border-cyan-700 flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3" />
                      {project.name}
                      <button
                        onClick={() => onFiltersChange({ 
                          projectIds: filters.projectIds.filter(id => id !== projectId)
                        })}
                        className="ml-1 hover:bg-cyan-800 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ) : null
                })}

                {filters.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="bg-indigo-900/30 text-indigo-200 border-indigo-700 flex items-center gap-1"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => onFiltersChange({ 
                        tags: filters.tags.filter(t => t !== tag)
                      })}
                      className="ml-1 hover:bg-indigo-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}