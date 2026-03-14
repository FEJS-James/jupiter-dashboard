'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { EnhancedBoard } from '@/components/kanban/enhanced-board'
import { MobileBoard } from '@/components/kanban/mobile-board'
import { TaskFormDialog } from '@/components/kanban/task-form-dialog'
import { DeleteTaskDialog } from '@/components/kanban/delete-task-dialog'
import { TaskFiltersComponent } from '@/components/tasks/task-filters'
import { MobileTaskFilters } from '@/components/tasks/mobile-task-filters'
import { ConnectionStatusIndicator } from '@/components/realtime/connection-status'
import { UserPresence } from '@/components/realtime/user-presence'
import { ActivityFeed, ActivityIndicator } from '@/components/realtime/activity-feed'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, RefreshCw, AlertCircle, Activity, ChevronDown, ChevronUp, Users, SlidersHorizontal } from 'lucide-react'
import { ArchiveView } from '@/components/kanban/archive-view'
import { Task, TaskStatus, Project, Agent } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks'
import { useTaskFilters } from '@/hooks/use-task-filters'
import { useWebSocket, ConnectedUser } from '@/contexts/websocket-context'
import { useProjectContext } from '@/contexts/project-context'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useMounted } from '@/hooks/use-mounted'

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
  const [activityExpanded, setActivityExpanded] = useState(false)
  const [activityTab, setActivityTab] = useState<string>('activity')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Selected project from sidebar dropdown
  const { selectedProjectId } = useProjectContext()

  // Mobile detection (guarded with useMounted to prevent hydration mismatch)
  const mounted = useMounted()
  const isMobileQuery = useMediaQuery('(max-width: 768px)')
  const isMobile = mounted && isMobileQuery

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

  const activeFilterCount = useMemo(() =>
    filters.statuses.length +
    filters.priorities.length +
    filters.assignees.length +
    filters.projectIds.length +
    filters.tags.length +
    (filters.search ? 1 : 0),
    [filters]
  )

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const tasksUrl = selectedProjectId
        ? `/api/tasks?project=${selectedProjectId}`
        : '/api/tasks'
      const [tasksRes, projectsRes, agentsRes] = await Promise.all([
        fetch(tasksUrl),
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
  }, [setTasks, selectedProjectId])

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

  const handleArchiveTask = async (task: Task) => {
    const isUnarchive = task.status === 'archived'
    const targetStatus: TaskStatus = isUnarchive ? 'done' : 'archived'
    try {
      await moveTaskRealtime(task.id, task.status, targetStatus)
      toast.success(isUnarchive ? 'Task restored to Done' : 'Task archived')
    } catch (error) {
      console.error(`Failed to ${isUnarchive ? 'unarchive' : 'archive'} task:`, error)
      toast.error(`Failed to ${isUnarchive ? 'unarchive' : 'archive'} task`)
    }
  }

  const handleArchiveAllDone = async () => {
    const doneTasks = tasks.filter(t => t.status === 'done')
    if (doneTasks.length === 0) return

    try {
      const taskIds = doneTasks.map(t => t.id)
      const res = await fetch('/api/tasks/bulk?operation=archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })

      if (!res.ok) throw new Error('Failed to archive tasks')

      toast.success(`Archived ${doneTasks.length} task${doneTasks.length !== 1 ? 's' : ''}`)
      fetchData()
    } catch (error) {
      console.error('Failed to archive all done tasks:', error)
      toast.error('Failed to archive done tasks')
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
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-hidden">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full sm:w-96" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: isMobile ? 1 : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full sm:w-80 shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 sm:p-6">
        <Alert className="bg-red-900/20 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-hidden" role="main" aria-label="Task Management">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 sm:space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Task Management</h1>
            <p className="text-sm sm:text-base text-slate-400">
              Real-time collaborative task management
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Connection status - hide on very small screens */}
            <div className="hidden sm:block">
              <ConnectionStatusIndicator />
            </div>
            
            {/* User presence - hide on mobile */}
            <div className="hidden md:block">
              <UserPresence maxUsers={4} />
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-slate-600 mx-2" />
            
            {/* Action buttons */}
            <Button 
              onClick={() => handleCreateTask()}
              className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
              aria-label="Create new task"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Task</span>
            </Button>
            <Button 
              onClick={fetchData}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 min-h-[44px]"
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

        {/* Filters Section — mobile uses MobileTaskFilters, desktop uses collapsible panel */}
        {isMobile ? (
          <MobileTaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
            filterStats={filterStats}
            tasks={tasks}
            projects={projects}
            agents={agents}
            isLoading={filtersLoading}
          />
        ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition-colors rounded-t-lg"
            aria-expanded={filtersExpanded}
            aria-controls="filters-panel"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-200">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  {activeFilterCount}
                </span>
              )}
              {!filtersExpanded && activeFilterCount > 0 && (
                <span className="text-xs text-slate-500 ml-1">
                  {filterStats.filteredTasks} of {filterStats.totalTasks} tasks
                </span>
              )}
            </div>
            <div className="text-slate-400">
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                id="filters-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-slate-700"
              >
                <CardContent className="p-4">
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
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        )}
      </motion.div>

      {/* Collapsible Activity & Users Bar — hidden on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={isMobile ? 'hidden' : ''}
      >
        <Card className="bg-slate-800/50 border-slate-700">
          {/* Collapsed header — always visible */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-4">
              <Tabs value={activityTab} onValueChange={(val) => { setActivityTab(val); setActivityExpanded(true) }}>
                <TabsList className="bg-slate-800/80 h-8">
                  <TabsTrigger value="activity" className="flex items-center gap-1.5 text-xs h-6 px-2.5">
                    <Activity className="w-3.5 h-3.5" />
                    Activity
                    {activities.length > 0 && (
                      <span className="ml-1 bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full">
                        {activities.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs h-6 px-2.5">
                    <Users className="w-3.5 h-3.5" />
                    Users
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Inline summary when collapsed */}
              {!activityExpanded && activities.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <ActivityIndicator />
                </div>
              )}
            </div>

            <button
              onClick={() => setActivityExpanded(!activityExpanded)}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              aria-expanded={activityExpanded}
              aria-controls="activity-panel"
              aria-label={activityExpanded ? 'Collapse activity panel' : 'Expand activity panel'}
            >
              {activityExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Expanded panel */}
          <AnimatePresence>
            {activityExpanded && (
              <motion.div
                id="activity-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-slate-700"
              >
                <CardContent className="p-4">
                  {activityTab === 'activity' ? (
                    activities.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto">
                        <ActivityFeed maxItems={4} showHeader={false} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">No recent activity</p>
                    )
                  ) : (
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <UserPresence showCount={true} maxUsers={10} />
                      </div>
                      {pendingUpdates.length > 0 && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <h4 className="font-medium text-orange-200 text-xs mb-1">Pending Updates</h4>
                          <p className="text-xs text-orange-300">
                            {pendingUpdates.length} updates being processed
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Full-Width Kanban Board */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="min-w-0 overflow-hidden"
      >
        {isMobile ? (
          <MobileBoard
            tasks={filteredTasks.map(task => ({
              ...task,
              isOptimistic: isOptimistic(task.id)
            }))}
            onCreateTask={handleCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        ) : (
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-6 overflow-x-auto">
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
                onArchiveTask={handleArchiveTask}
                onArchiveAllDone={handleArchiveAllDone}
              />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Archive View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ArchiveView onTasksChanged={fetchData} />
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