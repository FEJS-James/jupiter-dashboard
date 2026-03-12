'use client'

import { useState, useEffect, useCallback } from 'react'
import { Board } from '@/components/kanban/board'
import { TaskFormDialog } from '@/components/kanban/task-form-dialog'
import { DeleteTaskDialog } from '@/components/kanban/delete-task-dialog'
import { TaskFiltersComponent } from '@/components/tasks/task-filters'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { Task, TaskStatus, Project, Agent } from '@/types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useTaskOperations } from '@/hooks/use-task-operations'
import { useTaskFilters } from '@/hooks/use-task-filters'

export default function TasksPageContent() {
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

  // Enhanced filtering hook
  const {
    filters,
    setFilters,
    clearFilters,
    filteredTasks,
    filterStats,
    isLoading: filtersLoading
  } = useTaskFilters(tasks)

  // Task operations hook for drag and drop
  const { moveTask, isMoving, error: moveError } = useTaskOperations({
    onTaskMoved: (updatedTask) => {
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ))
      toast.success(`Task moved to ${updatedTask.status}`)
    },
    onError: (error) => {
      toast.error(`Failed to move task: ${error.message}`)
    }
  })

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

  // Filtered tasks are now handled by the useTaskFilters hook

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

  const handleMoveTask = async (taskId: number, newStatus: TaskStatus) => {
    await moveTask(taskId, newStatus)
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

  // clearFilters is now handled by the useTaskFilters hook

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

        {/* Enhanced Filters and Search */}
        <TaskFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          filterStats={filterStats}
          tasks={tasks}
          projects={projects}
          agents={agents}
          isLoading={filtersLoading}
        />
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
          onMoveTask={handleMoveTask}
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