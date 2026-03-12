'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { useDashboardPreferences } from '@/hooks/use-preference-hooks'
import { LandingPage, TaskView, DateRange } from '@/types'

const LANDING_PAGE_OPTIONS: { value: LandingPage; label: string; description: string }[] = [
  { value: 'dashboard', label: 'Dashboard', description: 'Project overview and activity feed' },
  { value: 'kanban', label: 'Kanban Board', description: 'Task management board view' },
  { value: 'projects', label: 'Projects', description: 'All projects overview' },
  { value: 'analytics', label: 'Analytics', description: 'Performance metrics and reports' },
]

const TASK_VIEW_OPTIONS: { value: TaskView; label: string; description: string }[] = [
  { value: 'list', label: 'List View', description: 'Traditional task list with details' },
  { value: 'kanban', label: 'Kanban Board', description: 'Visual board with columns' },
  { value: 'calendar', label: 'Calendar View', description: 'Tasks organized by due date' },
]

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog', description: 'Tasks waiting to be started' },
  { id: 'in-progress', label: 'In Progress', description: 'Tasks currently being worked on' },
  { id: 'code-review', label: 'Code Review', description: 'Tasks under review' },
  { id: 'testing', label: 'Testing', description: 'Tasks being tested' },
  { id: 'deploying', label: 'Deploying', description: 'Tasks being deployed' },
  { id: 'done', label: 'Done', description: 'Completed tasks' },
  { id: 'blocked', label: 'Blocked', description: 'Tasks that are blocked' },
]

const TASKS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

function SortableKanbanColumn({ column, isVisible, onToggleVisibility }: {
  column: typeof KANBAN_COLUMNS[0]
  isVisible: boolean
  onToggleVisibility: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
        isDragging ? 'shadow-lg' : ''
      } ${isVisible ? 'bg-background' : 'bg-gray-50'}`}
    >
      <div {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleVisibility}
        className="p-1 h-auto"
      >
        {isVisible ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400" />
        )}
      </Button>
      
      <div className="flex-1">
        <div className={`font-medium ${isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
          {column.label}
        </div>
        <div className="text-sm text-gray-600">{column.description}</div>
      </div>
      
      <Badge variant={isVisible ? 'default' : 'secondary'}>
        {isVisible ? 'Visible' : 'Hidden'}
      </Badge>
    </div>
  )
}

export function DashboardPreferences() {
  const {
    preferences,
    updatePreferences,
    isLoading
  } = useDashboardPreferences()
  
  const handleColumnVisibilityToggle = (columnId: string) => {
    const newVisible = kanbanColumnsVisible.includes(columnId)
      ? kanbanColumnsVisible.filter(id => id !== columnId)
      : [...kanbanColumnsVisible, columnId]
    
    setKanbanColumnsVisible(newVisible)
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = kanbanColumnOrder.indexOf(active.id as string)
      const newIndex = kanbanColumnOrder.indexOf(over.id as string)
      
      const newOrder = arrayMove(kanbanColumnOrder, oldIndex, newIndex)
      setKanbanColumnOrder(newOrder)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Default Landing Page */}
      <Card>
        <CardHeader>
          <CardTitle>Default Landing Page</CardTitle>
          <CardDescription>
            Choose which page you see when you first open the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {LANDING_PAGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  defaultLandingPage === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <input
                  type="radio"
                  name="landing-page"
                  value={option.value}
                  checked={defaultLandingPage === option.value}
                  onChange={() => setDefaultLandingPage(option.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 ${
                  defaultLandingPage === option.value
                    ? 'border-primary bg-primary'
                    : 'border-gray-300'
                }`}>
                  {defaultLandingPage === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Task View Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Task View Preferences</CardTitle>
          <CardDescription>
            Configure how tasks are displayed by default
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="default-task-view">Default Task View</Label>
              <Select value={defaultTaskView} onValueChange={setDefaultTaskView}>
                <SelectTrigger id="default-task-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_VIEW_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tasks-per-page">Tasks Per Page</Label>
              <Select value={tasksPerPage.toString()} onValueChange={(value) => setTasksPerPage(parseInt(value))}>
                <SelectTrigger id="tasks-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASKS_PER_PAGE_OPTIONS.map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} tasks
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Kanban Board Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Kanban Board Configuration</CardTitle>
          <CardDescription>
            Customize which columns are visible and their order on the kanban board
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Column Visibility and Order</Label>
            <p className="text-sm text-gray-600 mb-4">
              Toggle columns on/off and drag to reorder them
            </p>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={kanbanColumnOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {kanbanColumnOrder.map((columnId) => {
                    const column = KANBAN_COLUMNS.find(col => col.id === columnId)
                    if (!column) return null
                    
                    const isVisible = kanbanColumnsVisible.includes(columnId)
                    
                    return (
                      <SortableKanbanColumn
                        key={columnId}
                        column={column}
                        isVisible={isVisible}
                        onToggleVisibility={() => handleColumnVisibilityToggle(columnId)}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>
      
      {/* Layout and Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Layout and Navigation</CardTitle>
          <CardDescription>
            Configure layout and navigation preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sidebar-collapsed" className="text-base font-medium">
                Sidebar Collapsed by Default
              </Label>
              <p className="text-sm text-gray-600">
                Start with the sidebar collapsed to maximize content space
              </p>
            </div>
            <Switch
              id="sidebar-collapsed"
              checked={sidebarCollapsed}
              onCheckedChange={setSidebarCollapsed}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="default-date-range">Default Date Range for Reports</Label>
            <Select value={defaultDateRange} onValueChange={setDefaultDateRange}>
              <SelectTrigger id="default-date-range" className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}