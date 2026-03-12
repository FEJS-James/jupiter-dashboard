'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Task, TaskStatus } from '@/types'
import { useWebSocket } from '@/contexts/websocket-context'
import { toast } from 'sonner'

interface OptimisticUpdate {
  id: string
  type: 'create' | 'update' | 'delete' | 'move'
  taskId?: number
  originalTask?: Task
  optimisticTask?: Task
  timestamp: number
}

interface UseRealtimeTasksOptions {
  onTasksChange?: (tasks: Task[]) => void
  onError?: (error: Error) => void
}

interface UseRealtimeTasksReturn {
  tasks: Task[]
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void
  
  // Real-time operations with optimistic updates
  createTaskRealtime: (taskData: Partial<Task>) => Promise<Task>
  updateTaskRealtime: (taskId: number, updates: Partial<Task>) => Promise<Task>
  deleteTaskRealtime: (taskId: number) => Promise<void>
  moveTaskRealtime: (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus) => Promise<Task>
  
  // Connection status
  isConnected: boolean
  connectionStatus: string
  
  // Optimistic updates status
  pendingUpdates: OptimisticUpdate[]
  isOptimistic: (taskId: number) => boolean
}

export const useRealtimeTasks = (options: UseRealtimeTasksOptions = {}): UseRealtimeTasksReturn => {
  const { onTasksChange, onError } = options
  const { 
    socket, 
    connectionStatus, 
    emitTaskCreated, 
    emitTaskUpdated, 
    emitTaskDeleted, 
    emitTaskMoved,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskMoved
  } = useWebSocket()

  const [tasks, setTasks] = useState<Task[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([])
  const optimisticTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const isConnected = connectionStatus === 'connected'

  // Notify parent component of task changes
  useEffect(() => {
    if (onTasksChange) {
      onTasksChange(tasks)
    }
  }, [tasks, onTasksChange])

  // Clean up optimistic update after timeout
  const cleanupOptimisticUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => prev.filter(u => u.id !== updateId))
    const timeout = optimisticTimeoutRef.current.get(updateId)
    if (timeout) {
      clearTimeout(timeout)
      optimisticTimeoutRef.current.delete(updateId)
    }
  }, [])

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    const update = pendingUpdates.find(u => u.id === updateId)
    if (!update) return

    switch (update.type) {
      case 'create':
        if (update.optimisticTask) {
          setTasks(prev => prev.filter(t => t.id !== update.optimisticTask!.id))
        }
        break
      
      case 'update':
      case 'move':
        if (update.originalTask) {
          setTasks(prev => prev.map(t => 
            t.id === update.originalTask!.id ? update.originalTask! : t
          ))
        }
        break
      
      case 'delete':
        if (update.originalTask) {
          setTasks(prev => [...prev, update.originalTask!])
        }
        break
    }

    cleanupOptimisticUpdate(updateId)
    toast.error('Update failed - changes reverted')
  }, [pendingUpdates, cleanupOptimisticUpdate])

  // Add optimistic update with timeout
  const addOptimisticUpdate = useCallback((update: OptimisticUpdate) => {
    setPendingUpdates(prev => [...prev, update])
    
    // Set timeout to rollback if no confirmation received
    const timeout = setTimeout(() => {
      rollbackOptimisticUpdate(update.id)
    }, 10000) // 10 second timeout
    
    optimisticTimeoutRef.current.set(update.id, timeout)
  }, [rollbackOptimisticUpdate])

  // Create task with optimistic update
  const createTaskRealtime = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    const optimisticId = `temp_${Date.now()}`
    const optimisticTask: Task = {
      id: Date.now(), // Temporary ID
      title: taskData.title || 'New Task',
      description: taskData.description,
      status: taskData.status || 'backlog',
      priority: taskData.priority || 'medium',
      projectId: taskData.projectId || 0,
      assignedAgent: taskData.assignedAgent,
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...taskData
    } as Task

    // Optimistic update
    setTasks(prev => [...prev, optimisticTask])
    
    const update: OptimisticUpdate = {
      id: optimisticId,
      type: 'create',
      optimisticTask,
      timestamp: Date.now()
    }
    addOptimisticUpdate(update)

    try {
      // API call
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const result = await response.json()
      const actualTask = result.data

      // Replace optimistic task with actual task
      setTasks(prev => prev.map(t => 
        t.id === optimisticTask.id ? actualTask : t
      ))
      
      // Emit to other users
      emitTaskCreated(actualTask)
      
      // Clean up optimistic update
      cleanupOptimisticUpdate(optimisticId)
      
      toast.success('Task created successfully')
      return actualTask

    } catch (error) {
      rollbackOptimisticUpdate(optimisticId)
      if (onError) onError(error as Error)
      throw error
    }
  }, [addOptimisticUpdate, cleanupOptimisticUpdate, rollbackOptimisticUpdate, emitTaskCreated, onError])

  // Update task with optimistic update
  const updateTaskRealtime = useCallback(async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) throw new Error('Task not found')

    const optimisticId = `update_${taskId}_${Date.now()}`
    const optimisticTask = { ...originalTask, ...updates, updatedAt: new Date().toISOString() }

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? optimisticTask : t
    ))

    const update: OptimisticUpdate = {
      id: optimisticId,
      type: 'update',
      taskId,
      originalTask,
      optimisticTask,
      timestamp: Date.now()
    }
    addOptimisticUpdate(update)

    try {
      // API call
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      const actualTask = result.data

      // Replace optimistic task with actual task
      setTasks(prev => prev.map(t => 
        t.id === taskId ? actualTask : t
      ))

      // Emit to other users
      emitTaskUpdated(actualTask)

      // Clean up optimistic update
      cleanupOptimisticUpdate(optimisticId)

      toast.success('Task updated successfully')
      return actualTask

    } catch (error) {
      rollbackOptimisticUpdate(optimisticId)
      if (onError) onError(error as Error)
      throw error
    }
  }, [tasks, addOptimisticUpdate, cleanupOptimisticUpdate, rollbackOptimisticUpdate, emitTaskUpdated, onError])

  // Delete task with optimistic update
  const deleteTaskRealtime = useCallback(async (taskId: number): Promise<void> => {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) throw new Error('Task not found')

    const optimisticId = `delete_${taskId}_${Date.now()}`

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const update: OptimisticUpdate = {
      id: optimisticId,
      type: 'delete',
      taskId,
      originalTask,
      timestamp: Date.now()
    }
    addOptimisticUpdate(update)

    try {
      // API call
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Emit to other users
      emitTaskDeleted(taskId)

      // Clean up optimistic update
      cleanupOptimisticUpdate(optimisticId)

      toast.success('Task deleted successfully')

    } catch (error) {
      rollbackOptimisticUpdate(optimisticId)
      if (onError) onError(error as Error)
      throw error
    }
  }, [tasks, addOptimisticUpdate, cleanupOptimisticUpdate, rollbackOptimisticUpdate, emitTaskDeleted, onError])

  // Move task with optimistic update
  const moveTaskRealtime = useCallback(async (taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus): Promise<Task> => {
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) throw new Error('Task not found')

    const optimisticId = `move_${taskId}_${Date.now()}`
    const optimisticTask = { ...originalTask, status: toStatus, updatedAt: new Date().toISOString() }

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? optimisticTask : t
    ))

    const update: OptimisticUpdate = {
      id: optimisticId,
      type: 'move',
      taskId,
      originalTask,
      optimisticTask,
      timestamp: Date.now()
    }
    addOptimisticUpdate(update)

    try {
      // API call
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to move task')
      }

      const result = await response.json()
      const actualTask = result.data

      // Replace optimistic task with actual task
      setTasks(prev => prev.map(t => 
        t.id === taskId ? actualTask : t
      ))

      // Emit to other users
      emitTaskMoved(taskId, fromStatus, toStatus, actualTask)

      // Clean up optimistic update
      cleanupOptimisticUpdate(optimisticId)

      toast.success(`Task moved to ${toStatus}`)
      return actualTask

    } catch (error) {
      rollbackOptimisticUpdate(optimisticId)
      if (onError) onError(error as Error)
      throw error
    }
  }, [tasks, addOptimisticUpdate, cleanupOptimisticUpdate, rollbackOptimisticUpdate, emitTaskMoved, onError])

  // Check if task is in optimistic state
  const isOptimistic = useCallback((taskId: number): boolean => {
    return pendingUpdates.some(u => 
      u.taskId === taskId || u.optimisticTask?.id === taskId
    )
  }, [pendingUpdates])

  // Listen to real-time updates from other users
  useEffect(() => {
    if (!socket) return

    const unsubscribes = [
      onTaskCreated((task: Task) => {
        // Only add if not from our optimistic update
        if (!isOptimistic(task.id)) {
          setTasks(prev => {
            if (prev.find(t => t.id === task.id)) return prev
            return [...prev, task]
          })
          toast.info(`New task created: ${task.title}`)
        }
      }),

      onTaskUpdated((task: Task) => {
        if (!isOptimistic(task.id)) {
          setTasks(prev => prev.map(t => 
            t.id === task.id ? task : t
          ))
          toast.info(`Task updated: ${task.title}`)
        }
      }),

      onTaskDeleted((taskId: number) => {
        if (!isOptimistic(taskId)) {
          setTasks(prev => prev.filter(t => t.id !== taskId))
          toast.info('Task deleted')
        }
      }),

      onTaskMoved((taskId: number, fromStatus: TaskStatus, toStatus: TaskStatus, task: Task) => {
        if (!isOptimistic(taskId)) {
          setTasks(prev => prev.map(t => 
            t.id === taskId ? task : t
          ))
          toast.info(`Task moved to ${toStatus}`)
        }
      })
    ]

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [socket, onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskMoved, isOptimistic])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      optimisticTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      optimisticTimeoutRef.current.clear()
    }
  }, [])

  return {
    tasks,
    setTasks,
    createTaskRealtime,
    updateTaskRealtime,
    deleteTaskRealtime,
    moveTaskRealtime,
    isConnected,
    connectionStatus,
    pendingUpdates,
    isOptimistic
  }
}