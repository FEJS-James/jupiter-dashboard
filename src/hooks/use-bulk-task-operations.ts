'use client'

import { useState } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { useBulkTasks } from '@/contexts/bulk-task-context'

interface BulkOperationResult {
  success: boolean
  data?: any
  message?: string
  error?: string
}

interface UseBulkTaskOperationsOptions {
  onOperationComplete?: (operation: string, result: BulkOperationResult) => void
  onError?: (error: Error, operation: string) => void
}

export function useBulkTaskOperations(options: UseBulkTaskOperationsOptions = {}) {
  const { setOperationInProgress, clearSelection } = useBulkTasks()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (operation?: string) => {
    if (operation) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[operation]
        return newErrors
      })
    } else {
      setErrors({})
    }
  }

  const performBulkOperation = async <T>(
    operation: string,
    taskIds: number[],
    apiCall: () => Promise<Response>
  ): Promise<T> => {
    if (taskIds.length === 0) {
      throw new Error('No tasks selected')
    }

    setOperationInProgress(true, operation)
    clearError(operation)

    try {
      const response = await apiCall()
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
        throw new Error(errorData.error || `Failed to ${operation}: ${response.status}`)
      }

      const result = await response.json()
      
      options.onOperationComplete?.(operation, {
        success: true,
        data: result.data,
        message: result.message,
      })

      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${operation}`
      
      setErrors(prev => ({ ...prev, [operation]: errorMessage }))
      
      const operationResult = {
        success: false,
        error: errorMessage,
      }
      
      options.onOperationComplete?.(operation, operationResult)
      
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(errorMessage), operation)
      }
      
      throw error
    } finally {
      setOperationInProgress(false)
    }
  }

  const bulkMove = async (taskIds: number[], newStatus: TaskStatus, preserveAssignments = true): Promise<Task[]> => {
    return performBulkOperation(
      'move tasks',
      taskIds,
      () => fetch('/api/tasks/bulk?operation=move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          status: newStatus,
          preserveAssignments,
        }),
      })
    )
  }

  const bulkAssign = async (taskIds: number[], agentName: string | null): Promise<Task[]> => {
    const operation = agentName ? 'assign tasks' : 'unassign tasks'
    return performBulkOperation(
      operation,
      taskIds,
      () => fetch('/api/tasks/bulk?operation=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          assignedAgent: agentName,
        }),
      })
    )
  }

  const bulkPriority = async (taskIds: number[], priority: TaskPriority): Promise<Task[]> => {
    return performBulkOperation(
      'update priority',
      taskIds,
      () => fetch('/api/tasks/bulk?operation=priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          priority,
        }),
      })
    )
  }

  const bulkDelete = async (taskIds: number[], reason?: string): Promise<{ deletedCount: number; taskIds: number[] }> => {
    return performBulkOperation(
      'delete tasks',
      taskIds,
      () => fetch('/api/tasks/bulk?operation=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          reason,
        }),
      })
    )
  }

  const bulkTag = async (
    taskIds: number[], 
    tags: string[], 
    action: 'add' | 'remove' | 'replace'
  ): Promise<Task[]> => {
    return performBulkOperation(
      `${action} tags`,
      taskIds,
      () => fetch('/api/tasks/bulk?operation=tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          tags,
          action,
        }),
      })
    )
  }

  const bulkEdit = async (
    taskIds: number[], 
    updates: {
      description?: string
      dueDate?: string | null
      effort?: number
      tags?: string[]
    }
  ): Promise<Task[]> => {
    return performBulkOperation(
      'edit tasks',
      taskIds,
      () => fetch('/api/tasks/bulk?operation=edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          updates,
        }),
      })
    )
  }

  // Convenience method for common workflow
  const bulkOperationWithConfirmation = async <T>(
    operation: string,
    taskIds: number[],
    confirmationMessage: string,
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    const confirmed = window.confirm(
      `${confirmationMessage}\n\nThis will affect ${taskIds.length} task(s). This action cannot be undone.`
    )
    
    if (!confirmed) {
      return null
    }
    
    try {
      const result = await apiCall()
      
      // Clear selection after successful operation
      setTimeout(() => {
        clearSelection()
      }, 1000)
      
      return result
    } catch (error) {
      // Re-throw to let the caller handle it
      throw error
    }
  }

  return {
    // Core operations
    bulkMove,
    bulkAssign,
    bulkPriority,
    bulkDelete,
    bulkTag,
    bulkEdit,
    
    // Utility methods
    bulkOperationWithConfirmation,
    clearError,
    
    // State
    errors,
  }
}