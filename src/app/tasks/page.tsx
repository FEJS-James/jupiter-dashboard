'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Board } from '@/components/kanban/board'
import { TaskFormDialog } from '@/components/kanban/task-form-dialog'
import { DeleteTaskDialog } from '@/components/kanban/delete-task-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, RefreshCw, AlertCircle, Filter, Search } from 'lucide-react'
import { Task, TaskStatus, Project, Agent } from '@/types'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('backlog')
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  // Debounced search term to prevent excessive filtering
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [tasksRes, projectsRes, agentsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
        fetch('/api/agents')
      ])

      if (!tasksRes.ok || !projectsRes.ok || !agentsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [tasksData, projectsData, agentsData] = await Promise.all([
        tasksRes.json(),
        projectsRes.json(),
        agentsRes.json()
      ])

      if (tasksData.success && projectsData.success && agentsData.success) {
        setTasks(tasksData.data)
        setProjects(projectsData.data)
        setAgents(agentsData.data)
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setError('Failed to load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [setError, setTasks, setProjects, setAgents, setLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    if (debouncedSearchTerm && !task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
      return false
    }
    if (filterProject && task.projectId !== parseInt(filterProject)) {
      return false
    }
    if (filterStatus && task.status !== filterStatus) {
      return false
    }
    if (filterAssignee && task.assignedAgent !== filterAssignee) {
      return false
    }
    return true
  })

  const handleCreateTask = (status: TaskStatus = 'backlog') => {
    setEditingTask(null)
    setDefaultStatus(status)
    setShowTaskForm(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task)
    setShowDeleteDialog(true)
  }

  const submitTaskForm = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Update existing task
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update task')
        }

        const result = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === editingTask.id ? { ...task, ...result.data } : task
        ))
        toast.success('Task updated successfully!')
      } else {
        // Create new task
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create task')
        }

        const result = await response.json()
        
        // Fetch the complete task with relations
        const taskDetailsResponse = await fetch(`/api/tasks/${result.data.id}`)
        if (taskDetailsResponse.ok) {
          const taskDetails = await taskDetailsResponse.json()
          if (taskDetails.success) {
            setTasks(prev => [...prev, taskDetails.data])
            toast.success('Task created successfully!')
          }
        }
      }
    } catch (error) {
      console.error('Task submission error:', error)
      toast.error(editingTask ? 'Failed to update task' : 'Failed to create task')
      throw error
    }
  }

  const confirmDeleteTask = async () => {
    if (!deletingTask) return

    try {
      const response = await fetch(`/api/tasks/${deletingTask.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete task')
      }

      setTasks(prev => prev.filter(task => task.id !== deletingTask.id))
      toast.success('Task deleted successfully!')
    } catch (error) {
      console.error('Delete task error:', error)
      toast.error('Failed to delete task')
      // Don't re-throw error to allow dialog to close
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterProject('')
    setFilterStatus('')
    setFilterAssignee('')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-80" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="bg-red-900/20 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200 flex items-center gap-4">
            <span>{error}</span>
            <Button 
              onClick={fetchData}
              variant="outline" 
              size="sm"
              className="bg-red-600 hover:bg-red-700 border-red-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" role="main" aria-label="Task Management">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Task Management</h1>
            <p className="text-slate-400">
              Manage tasks across your development pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleCreateTask()}
              className="bg-blue-600 hover:bg-blue-700"
              aria-label="Create new task"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
            <Button 
              onClick={fetchData}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              aria-label="Refresh tasks data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="bg-slate-800/50 border-slate-700" role="search" aria-label="Task filters and search">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Project</label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="" className="text-slate-100">All projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()} className="text-slate-100">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="" className="text-slate-100">All statuses</SelectItem>
                    <SelectItem value="backlog" className="text-slate-100">Backlog</SelectItem>
                    <SelectItem value="in-progress" className="text-slate-100">In Progress</SelectItem>
                    <SelectItem value="code-review" className="text-slate-100">Code Review</SelectItem>
                    <SelectItem value="testing" className="text-slate-100">Testing</SelectItem>
                    <SelectItem value="deploying" className="text-slate-100">Deploying</SelectItem>
                    <SelectItem value="done" className="text-slate-100">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Assignee</label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="" className="text-slate-100">All assignees</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.name} className="text-slate-100">
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active filters and clear button */}
            {(searchTerm || filterProject || filterStatus || filterAssignee) && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-400">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      Search: &quot;{searchTerm}&quot;
                    </Badge>
                  )}
                  {filterProject && (
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      Project: {projects.find(p => p.id.toString() === filterProject)?.name}
                    </Badge>
                  )}
                  {filterStatus && (
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      Status: {filterStatus}
                    </Badge>
                  )}
                  {filterAssignee && (
                    <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                      Assignee: {filterAssignee}
                    </Badge>
                  )}
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-200 h-6"
                    aria-label="Clear all active filters"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        clearFilters()
                      }
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Task Board */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-800/30 rounded-lg p-6 min-h-[600px]"
      >
        <Board 
          tasks={filteredTasks}
          onCreateTask={handleCreateTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </motion.div>

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={showTaskForm}
        onClose={() => {
          setShowTaskForm(false)
          setEditingTask(null)
        }}
        onSubmit={submitTaskForm}
        task={editingTask}
        defaultStatus={defaultStatus}
        projects={projects}
        agents={agents}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeletingTask(null)
        }}
        onConfirm={confirmDeleteTask}
        task={deletingTask}
      />
    </div>
  )
}