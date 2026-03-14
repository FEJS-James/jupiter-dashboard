'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { 
  Zap, 
  Plus, 
  Minus, 
  Save, 
  FolderOpen, 
  AlertTriangle, 
  FileDown,
  GripVertical,
  Eye,
  EyeOff,
  Info
} from 'lucide-react'
import { useProductivityPreferences } from '@/hooks/use-preference-hooks'
import { TaskPriority, ExportFormat, Project } from '@/types'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Low', description: 'Non-urgent tasks', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', description: 'Standard priority', color: 'text-yellow-600' },
  { value: 'high', label: 'High', description: 'Important tasks', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', description: 'Critical tasks', color: 'text-red-600' },
]

const EXPORT_FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string; icon: string }[] = [
  { value: 'json', label: 'JSON', description: 'Machine-readable format', icon: '{}' },
  { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible', icon: '📊' },
  { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel format', icon: '📈' },
  { value: 'pdf', label: 'PDF', description: 'Printable reports', icon: '📄' },
]

const AVAILABLE_QUICK_ACTIONS = [
  { id: 'create-task', label: 'Create Task', description: 'Quick task creation button', icon: Plus },
  { id: 'assign-task', label: 'Assign Task', description: 'Quick task assignment', icon: FolderOpen },
  { id: 'change-status', label: 'Change Status', description: 'Quick status change', icon: AlertTriangle },
  { id: 'bulk-edit', label: 'Bulk Edit', description: 'Select multiple tasks', icon: FileDown },
  { id: 'export-data', label: 'Export Data', description: 'Quick export button', icon: FileDown },
  { id: 'create-project', label: 'Create Project', description: 'New project button', icon: FolderOpen },
]

function SortableQuickAction({ action, index }: { action: typeof AVAILABLE_QUICK_ACTIONS[0], index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const Icon = action.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 border rounded-lg bg-background ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Icon className="h-4 w-4 text-primary" />
      
      <div className="flex-1">
        <div className="font-medium">{action.label}</div>
        <div className="text-sm text-gray-600">{action.description}</div>
      </div>
      
      <Badge variant="outline">Position {index + 1}</Badge>
    </div>
  )
}

export function ProductivityPreferences() {
  const {
    defaultTaskPriority,
    defaultProjectId,
    autoSaveEnabled,
    quickActionButtons,
    defaultExportFormat,
    setDefaultTaskPriority,
    setDefaultProjectId,
    setAutoSaveEnabled,
    setQuickActionButtons,
    setDefaultExportFormat,
  } = useProductivityPreferences()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Load available projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) {
          throw new Error(`Failed to load projects: ${response.statusText}`)
        }
        const data: Project[] = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Failed to load projects:', error)
        // Set empty array on failure — UI will show "No default project" as the only option
        setProjects([])
      } finally {
        setLoadingProjects(false)
      }
    }
    
    loadProjects()
  }, [])
  
  const handleQuickActionReorder = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = quickActionButtons.indexOf(active.id as string)
      const newIndex = quickActionButtons.indexOf(over.id as string)
      
      const newOrder = arrayMove(quickActionButtons, oldIndex, newIndex)
      setQuickActionButtons(newOrder)
    }
  }
  
  const toggleQuickAction = (actionId: string) => {
    if (quickActionButtons.includes(actionId)) {
      setQuickActionButtons(quickActionButtons.filter(id => id !== actionId))
    } else {
      setQuickActionButtons([...quickActionButtons, actionId])
    }
  }
  
  const getActionById = (id: string) => AVAILABLE_QUICK_ACTIONS.find(action => action.id === id)
  
  return (
    <div className="space-y-6" role="region" aria-label="Productivity preferences">
      {/* Default Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Default Values
          </CardTitle>
          <CardDescription>
            Set default values for new tasks and projects to speed up creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="default-task-priority">Default Task Priority</Label>
              <Select value={defaultTaskPriority} onValueChange={setDefaultTaskPriority}>
                <SelectTrigger id="default-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-current ${option.color}`}></div>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-project">Default Project</Label>
              <Select 
                value={defaultProjectId?.toString() || ''} 
                onValueChange={(value) => setDefaultProjectId(value ? parseInt(value) : undefined)}
              >
                <SelectTrigger id="default-project">
                  <SelectValue placeholder="No default project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No default project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-gray-600 capitalize">{project.status}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These defaults will be pre-selected when creating new tasks, but can be changed for individual items.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      {/* Auto-Save Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Auto-Save
          </CardTitle>
          <CardDescription>
            Configure automatic saving of form data and drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-save-enabled" className="text-base font-medium">
                Enable Auto-Save
              </Label>
              <p className="text-sm text-gray-600">
                Automatically save form changes every few seconds to prevent data loss
              </p>
            </div>
            <Switch
              id="auto-save-enabled"
              checked={autoSaveEnabled}
              onCheckedChange={setAutoSaveEnabled}
            />
          </div>
          
          {autoSaveEnabled && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Save className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Auto-Save Active</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Form changes are saved automatically every 30 seconds</li>
                <li>• Draft data is preserved even if you navigate away</li>
                <li>• Unsaved changes indicator shows when data is being saved</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quick Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Action Buttons</CardTitle>
          <CardDescription>
            Customize which quick action buttons appear in your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-3 block">Available Actions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                const isActive = quickActionButtons.includes(action.id)
                
                return (
                  <div
                    key={action.id}
                    className={`flex items-center p-3 border rounded-lg transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                      <div>
                        <div className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                          {action.label}
                        </div>
                        <div className="text-sm text-gray-600">{action.description}</div>
                      </div>
                    </div>
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleQuickAction(action.id)}
                    >
                      {isActive ? (
                        <>
                          <Minus className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
          
          {quickActionButtons.length > 0 && (
            <div>
              <Label className="text-base font-medium mb-3 block">Button Order</Label>
              <p className="text-sm text-gray-600 mb-3">
                Drag to reorder your quick action buttons
              </p>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleQuickActionReorder}
              >
                <SortableContext items={quickActionButtons} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {quickActionButtons.map((actionId, index) => {
                      const action = getActionById(actionId)
                      if (!action) return null
                      
                      return (
                        <SortableQuickAction
                          key={actionId}
                          action={action}
                          index={index}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Settings
          </CardTitle>
          <CardDescription>
            Configure default export formats and options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="default-export-format">Default Export Format</Label>
            <Select value={defaultExportFormat} onValueChange={setDefaultExportFormat}>
              <SelectTrigger id="default-export-format" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Summary</CardTitle>
          <CardDescription>
            Overview of your current productivity settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary capitalize">
                {defaultTaskPriority}
              </div>
              <div className="text-sm text-gray-600">Default Priority</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {quickActionButtons.length}
              </div>
              <div className="text-sm text-gray-600">Quick Actions</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary uppercase">
                {defaultExportFormat}
              </div>
              <div className="text-sm text-gray-600">Export Format</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}