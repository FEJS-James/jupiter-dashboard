'use client'

import { useState, useEffect, useCallback } from 'react'
import { EnhancedBoard } from '@/components/kanban/enhanced-board'
import { TaskFormDialog } from '@/components/kanban/task-form-dialog'
import { DeleteTaskDialog } from '@/components/kanban/delete-task-dialog'
import { TaskFiltersComponent } from '@/components/tasks/task-filters'
import { ConnectionStatusIndicator } from '@/components/realtime/connection-status'
import { UserPresence } from '@/components/realtime/user-presence'
import { ActivityFeed, ActivityIndicator } from '@/components/realtime/activity-feed'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, RefreshCw, AlertCircle, Activity } from 'lucide-react'
import { Task, TaskStatus, Project, Agent } from '@/types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks'
import { useTaskFilters } from '@/hooks/use-task-filters'
import { useWebSocket, ConnectedUser } from '@/contexts/websocket-context'

export default function TasksPageContentRealtime() {
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

  // WebSocket and real-time functionality
  const { 
    joinBoard, 
    connectionStatus,
    activities 
  } = useWebSocket()

  // Real-time tasks with optimistic updates
  const {
    tasks,
    setTasks,
    createTaskRealtime,
    updateTaskRealtime,
    deleteTaskRealtime,
    moveTaskRealtime,
    isConnected,
    pendingUpdates,
    isOptimistic
  } = useRealtimeTasks({
    onError: (error) => {
      toast.error(`Real-time error: ${error.message}`)
    }
  })

  // Enhanced filtering hook
  const {
    filters,
    setFilters,
    clearFilters,
    filteredTasks,
    filterStats,
    isLoading: filtersLoading
  } = useTaskFilters(tasks)

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
  }, [setTasks])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Join the board for real-time collaboration when connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const user: ConnectedUser = {
        id: `user_${Date.now()}`, // In real app, this would come from auth
        name: 'Current User', // In real app, this would come from auth
        email: 'user@example.com', // In real app, this would come from auth
        color: '#3B82F6', // Random color or user preference
        lastSeen: new Date(),
      }
      
      joinBoard('main-board', user)
    }
  }, [connectionStatus, joinBoard])

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
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    try {
      await moveTaskRealtime(taskId, task.status, newStatus)
    } catch (error) {
      console.error('Failed to move task:', error)
      // Error handling is done in the hook
    }
  }

  const submitTaskForm = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Update existing task with real-time
        await updateTaskRealtime(editingTask.id, taskData)
      } else {
        // Create new task with real-time
        await createTaskRealtime({
          ...taskData,
          status: defaultStatus
        })
      }
    } catch (error) {
      console.error('Task submission error:', error)
      // Error handling is done in the hook
      throw error
    }
  }

  const confirmDeleteTask = async () => {
    if (!deletingTask) return

    try {
      await deleteTaskRealtime(deletingTask.id)
    } catch (error) {
      console.error('Delete task error:', error)
      // Error handling is done in the hook
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-80" />
              ))}
            </div>
          </div>
          <div className="w-80">
            <Skeleton className="h-96 w-full" />
          </div>
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
              Real-time collaborative task management
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Connection status */}
            <ConnectionStatusIndicator />
            
            {/* Activity indicator */}
            {activities.length > 0 && <ActivityIndicator />}
            
            {/* User presence */}
            <UserPresence maxUsers={4} />
            
            <div className="h-6 w-px bg-slate-600 mx-2" />
            
            {/* Action buttons */}
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

        {/* Connection warning */}
        {!isConnected && (
          <Alert className="bg-yellow-900/20 border-yellow-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-200">
              Real-time updates are temporarily disabled. Changes will sync when connection is restored.
              {pendingUpdates.length > 0 && (
                <span className="ml-2">
                  ({pendingUpdates.length} pending updates)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

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

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Main Board Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1"
        >
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-6">
              <EnhancedBoard 
                tasks={filteredTasks.map(task => ({
                  ...task,
                  isOptimistic: isOptimistic(task.id)
                }))}
                agents={agents}
                onCreateTask={handleCreateTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
                onTasksUpdated={fetchData}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar with Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-80"
        >
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UserPresence showCount={false} maxUsers={1} />
                Users
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="space-y-4">
              <ActivityFeed maxItems={15} />
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Online Users</h3>
                  <UserPresence showCount={true} maxUsers={10} />
                  
                  {pendingUpdates.length > 0 && (
                    <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <h4 className="font-medium text-orange-200 mb-2">Pending Updates</h4>
                      <p className="text-sm text-orange-300">
                        {pendingUpdates.length} updates are being processed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

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