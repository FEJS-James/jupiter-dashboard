'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Task, TaskStatus, TaskPriority, Project, Agent } from '@/types'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/theme-context'
import { useMediaQuery } from '@/hooks/use-media-query'
import { 
  X, 
  Plus, 
  Calendar, 
  User, 
  Flag, 
  Tag,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2
} from 'lucide-react'

interface MobileTaskFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (taskData: Partial<Task>) => Promise<void>
  task?: Task | null
  defaultStatus?: TaskStatus
  projects: Project[]
  agents: Agent[]
}

const statusOptions: Array<{ value: TaskStatus; label: string; icon: string }> = [
  { value: 'backlog', label: 'Backlog', icon: '📋' },
  { value: 'in-progress', label: 'In Progress', icon: '🔄' },
  { value: 'code-review', label: 'Code Review', icon: '👁️' },
  { value: 'testing', label: 'Testing', icon: '🧪' },
  { value: 'deploying', label: 'Deploying', icon: '🚀' },
  { value: 'done', label: 'Done', icon: '✅' },
]

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'bg-slate-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
]

export function MobileTaskFormDialog({
  open,
  onClose,
  onSubmit,
  task,
  defaultStatus = 'backlog',
  projects,
  agents
}: MobileTaskFormDialogProps) {
  const { actualTheme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium',
    tags: [],
    effort: 1,
    projectId: projects[0]?.id || undefined,
    assignedAgent: undefined,
    dueDate: undefined,
  })
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const steps = [
    { title: 'Basic Info', icon: '📝' },
    { title: 'Details', icon: '⚙️' },
    { title: 'Assignment', icon: '👤' },
    { title: 'Review', icon: '✅' }
  ]

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || defaultStatus,
        priority: task.priority || 'medium',
        tags: task.tags || [],
        effort: task.effort || 1,
        projectId: task.projectId || projects[0]?.id || undefined,
        assignedAgent: task.assignedAgent || undefined,
        dueDate: task.dueDate || undefined,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        tags: [],
        effort: 1,
        projectId: projects[0]?.id || undefined,
        assignedAgent: undefined,
        dueDate: undefined,
      })
    }
    setCurrentStep(0)
  }, [task, defaultStatus, projects])

  const updateFormData = (updates: Partial<Task>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const addTag = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      updateFormData({ tags: [...(formData.tags || []), newTag] })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    updateFormData({ tags: formData.tags?.filter(tag => tag !== tagToRemove) })
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Failed to submit task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return (formData.title?.trim().length || 0) > 0
      case 1:
        return true
      case 2:
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  if (!isMobile) {
    return null // Use desktop version for non-mobile
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        'mobile-drawer p-0 max-w-full h-full rounded-none border-0',
        actualTheme === 'dark' ? 'bg-slate-950' : 'bg-white'
      )}>
        {/* Mobile Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b',
          actualTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        )}>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              actualTheme === 'dark' 
                ? 'hover:bg-slate-800 text-slate-400' 
                : 'hover:bg-slate-100 text-slate-600'
            )}
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <h2 className={cn(
              'text-lg font-semibold',
              actualTheme === 'dark' ? 'text-white' : 'text-slate-900'
            )}>
              {task ? 'Edit Task' : 'Create Task'}
            </h2>
            <p className="text-sm text-slate-500">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Indicator */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div 
                key={step.title}
                className={cn(
                  'flex flex-col items-center space-y-1 flex-1',
                  index <= currentStep ? 'opacity-100' : 'opacity-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : actualTheme === 'dark'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                )}>
                  {step.icon}
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="title" className="text-base font-medium">
                    Task Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title || ''}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    placeholder="What needs to be done?"
                    className="mt-2 text-base p-4 h-12"
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="Add more details about this task..."
                    className="mt-2 text-base p-4 min-h-24"
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Status</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFormData({ status: option.value })}
                        className={cn(
                          'flex items-center space-x-2 p-3 rounded-lg border transition-colors',
                          formData.status === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-base font-medium">Priority</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFormData({ priority: option.value })}
                        className={cn(
                          'flex items-center space-x-2 p-3 rounded-lg border transition-colors',
                          formData.priority === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn('w-3 h-3 rounded-full', option.color)} />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">
                    Effort Estimation: {formData.effort} points
                  </Label>
                  <div className="mt-3">
                    <Slider
                      value={[formData.effort || 1]}
                      onValueChange={(value: number[]) => updateFormData({ effort: value[0] })}
                      max={13}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1</span>
                      <span>5</span>
                      <span>13</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {(Array.isArray(formData.tags) ? formData.tags : []).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-sm py-1 px-2 flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label className="text-base font-medium">Project</Label>
                  <Select
                    value={formData.projectId?.toString() || ''}
                    onValueChange={(value) => updateFormData({ projectId: parseInt(value) })}
                  >
                    <SelectTrigger className="mt-2 h-12 text-base">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium">Assign to Agent</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    <button
                      onClick={() => updateFormData({ assignedAgent: undefined })}
                      className={cn(
                        'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                        !formData.assignedAgent
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : actualTheme === 'dark'
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Unassigned</span>
                    </button>
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => updateFormData({ assignedAgent: agent.name })}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                          formData.assignedAgent === agent.name
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : actualTheme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800'
                              : 'border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">{agent.name}</span>
                          <p className="text-sm text-slate-500">{agent.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className={cn(
                  'rounded-lg border p-4',
                  actualTheme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
                )}>
                  <h3 className="font-semibold mb-4">Task Summary</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Title:</span>
                      <span className="font-medium">{formData.title}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-medium">
                        {statusOptions.find(s => s.value === formData.status)?.label}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Priority:</span>
                      <div className="flex items-center space-x-1">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          priorityOptions.find(p => p.value === formData.priority)?.color
                        )} />
                        <span className="font-medium">
                          {priorityOptions.find(p => p.value === formData.priority)?.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Effort:</span>
                      <span className="font-medium">{formData.effort} points</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Project:</span>
                      <span className="font-medium">
                        {projects.find(p => p.id === formData.projectId)?.name || 'None'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned to:</span>
                      <span className="font-medium">
                        {formData.assignedAgent || 'Unassigned'}
                      </span>
                    </div>
                    
                    {Array.isArray(formData.tags) && formData.tags.length > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-slate-500">Tags:</span>
                        <div className="flex flex-wrap gap-1 ml-2">
                          {formData.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className={cn(
          'flex items-center justify-between p-4 border-t',
          actualTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
        )}>
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}</span>
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Safe area padding */}
        <div className="pb-safe" />
      </DialogContent>
    </Dialog>
  )
}