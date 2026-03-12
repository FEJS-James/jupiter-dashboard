'use client'

import { useState } from 'react'
import { Task, TaskStatus } from '@/types'

interface UseTaskOperationsOptions {
  onTaskMoved?: (task: Task) => void
  onError?: (error: Error) => void
}

interface MoveTaskRequest {
  status: TaskStatus
  assignedAgent?: string | null
}

export function useTaskOperations(options: UseTaskOperationsOptions = {}) {
  const [isMoving, setIsMoving] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const moveTask = async (taskId: number, newStatus: TaskStatus): Promise<Task> => {
    setIsMoving(prev => ({ ...prev, [taskId]: true }))
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        } as MoveTaskRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Failed to move task: ${response.status}`)
      }

      const data = await response.json()
      const updatedTask = data.data || data

      options.onTaskMoved?.(updatedTask)
      return updatedTask
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move task'
      setError(errorMessage)
      
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(errorMessage))
      } else {
        // Default error handling - could be enhanced with a toast notification
        console.error('Failed to move task:', error)
      }
      
      throw error
    } finally {
      setIsMoving(prev => ({ ...prev, [taskId]: false }))
    }
  }

  const clearError = () => setError(null)

  return {
    moveTask,
    isMoving,
    error,
    clearError,
  }
}