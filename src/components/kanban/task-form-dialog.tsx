'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, X, Plus } from 'lucide-react'
import { Task, TaskPriority, TaskStatus, Project, Agent } from '@/types'

interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (taskData: Partial<Task>) => Promise<void>
  task?: Task | null
  defaultStatus?: TaskStatus
  projects: Project[]
  agents: Agent[]
}

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
]

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'code-review', label: 'Code Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'deploying', label: 'Deploying' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

export function TaskFormDialog({ 
  open, 
  onClose, 
  onSubmit, 
  task, 
  defaultStatus = 'backlog',
  projects,
  agents
}: TaskFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: defaultStatus,
    projectId: 0,
    assignedAgent: '',
    dueDate: '',
    effort: 0,
    tags: [] as string[],
    dependencies: [] as number[]
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
    if (task) {
      // Edit mode - populate with existing task data
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || defaultStatus,
        projectId: task.projectId || 0,
        assignedAgent: task.assignedAgent || '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '', // Format for datetime-local input
        effort: task.effort || 0,
        tags: task.tags || [],
        dependencies: task.dependencies || []
      })
    } else {
      // Create mode - reset to defaults
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: defaultStatus,
        projectId: projects.length > 0 ? projects[0].id : 0,
        assignedAgent: '',
        dueDate: '',
        effort: 0,
        tags: [],
        dependencies: []
      })
    }
    setErrors({})
    setNewTag('')
  }, [task, defaultStatus, projects, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required'
    }

    if (formData.effort < 0) {
      newErrors.effort = 'Effort must be positive'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const taskData: Partial<Task> = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        effort: formData.effort || undefined,
        assignedAgent: formData.assignedAgent || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        dependencies: formData.dependencies.length > 0 ? formData.dependencies : undefined
      }

      await onSubmit(taskData)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      setErrors({ submit: 'Failed to save task. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    const tag = newTag.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const isEditing = !!task

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-200">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              className="bg-slate-800 border-slate-600 text-slate-100"
              autoFocus
            />
            {errors.title && (
              <p className="text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-200">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task details..."
              rows={3}
              className="bg-slate-800 border-slate-600 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="project" className="text-slate-200">
                Project <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.projectId.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: parseInt(value) }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()} className="text-slate-100">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-red-400">{errors.projectId}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-200">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: TaskStatus) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-slate-100">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-slate-200">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Agent */}
            <div className="space-y-2">
              <Label htmlFor="assignedAgent" className="text-slate-200">
                Assigned Agent
              </Label>
              <Select
                value={formData.assignedAgent}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedAgent: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="" className="text-slate-100">No assignment</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.name} className="text-slate-100">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: agent.color }}
                        />
                        {agent.name} ({agent.role})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-slate-200">
                Due Date
              </Label>
              <div className="relative">
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Effort */}
            <div className="space-y-2">
              <Label htmlFor="effort" className="text-slate-200">
                Effort (points)
              </Label>
              <Input
                id="effort"
                type="number"
                min="0"
                value={formData.effort}
                onChange={(e) => setFormData(prev => ({ ...prev, effort: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                className="bg-slate-800 border-slate-600 text-slate-100"
              />
              {errors.effort && (
                <p className="text-sm text-red-400">{errors.effort}</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-slate-200">
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="bg-slate-800 border-slate-600 text-slate-100 flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addTag}
                size="sm"
                className="bg-slate-700 hover:bg-slate-600"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge 
                    key={tag}
                    variant="secondary"
                    className="bg-slate-700 text-slate-200 px-2 py-1 flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Task' : 'Create Task')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}