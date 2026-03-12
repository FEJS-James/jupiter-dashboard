'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'

export interface BulkTaskState {
  selectedTaskIds: Set<number>
  isSelectMode: boolean
  operationInProgress: boolean
  lastOperation: string | null
}

export interface BulkTaskActions {
  selectTask: (taskId: number) => void
  deselectTask: (taskId: number) => void
  toggleTaskSelection: (taskId: number) => void
  selectAll: (tasks: Task[]) => void
  selectAllInColumn: (tasks: Task[], status: TaskStatus) => void
  clearSelection: () => void
  setSelectMode: (enabled: boolean) => void
  setOperationInProgress: (inProgress: boolean, operation?: string) => void
}

export interface BulkTaskContextValue extends BulkTaskState, BulkTaskActions {
  selectedTasks: Task[]
  selectedCount: number
  isSelected: (taskId: number) => boolean
  canPerformBulkOperations: boolean
}

type BulkTaskAction = 
  | { type: 'SELECT_TASK'; taskId: number }
  | { type: 'DESELECT_TASK'; taskId: number }
  | { type: 'TOGGLE_TASK'; taskId: number }
  | { type: 'SELECT_ALL'; taskIds: number[] }
  | { type: 'SELECT_COLUMN'; taskIds: number[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECT_MODE'; enabled: boolean }
  | { type: 'SET_OPERATION_IN_PROGRESS'; inProgress: boolean; operation?: string }

const initialState: BulkTaskState = {
  selectedTaskIds: new Set<number>(),
  isSelectMode: false,
  operationInProgress: false,
  lastOperation: null,
}

function bulkTaskReducer(state: BulkTaskState, action: BulkTaskAction): BulkTaskState {
  switch (action.type) {
    case 'SELECT_TASK': {
      const newSelectedIds = new Set(state.selectedTaskIds)
      newSelectedIds.add(action.taskId)
      return {
        ...state,
        selectedTaskIds: newSelectedIds,
        isSelectMode: true,
      }
    }
    
    case 'DESELECT_TASK': {
      const newSelectedIds = new Set(state.selectedTaskIds)
      newSelectedIds.delete(action.taskId)
      return {
        ...state,
        selectedTaskIds: newSelectedIds,
        isSelectMode: newSelectedIds.size > 0,
      }
    }
    
    case 'TOGGLE_TASK': {
      const newSelectedIds = new Set(state.selectedTaskIds)
      if (newSelectedIds.has(action.taskId)) {
        newSelectedIds.delete(action.taskId)
      } else {
        newSelectedIds.add(action.taskId)
      }
      return {
        ...state,
        selectedTaskIds: newSelectedIds,
        isSelectMode: newSelectedIds.size > 0,
      }
    }
    
    case 'SELECT_ALL': {
      return {
        ...state,
        selectedTaskIds: new Set(action.taskIds),
        isSelectMode: true,
      }
    }
    
    case 'SELECT_COLUMN': {
      const newSelectedIds = new Set(state.selectedTaskIds)
      action.taskIds.forEach(id => newSelectedIds.add(id))
      return {
        ...state,
        selectedTaskIds: newSelectedIds,
        isSelectMode: true,
      }
    }
    
    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedTaskIds: new Set<number>(),
        isSelectMode: false,
      }
    }
    
    case 'SET_SELECT_MODE': {
      return {
        ...state,
        isSelectMode: action.enabled,
        selectedTaskIds: action.enabled ? state.selectedTaskIds : new Set<number>(),
      }
    }
    
    case 'SET_OPERATION_IN_PROGRESS': {
      return {
        ...state,
        operationInProgress: action.inProgress,
        lastOperation: action.operation || state.lastOperation,
      }
    }
    
    default:
      return state
  }
}

const BulkTaskContext = createContext<BulkTaskContextValue | null>(null)

interface BulkTaskProviderProps {
  children: React.ReactNode
  tasks: Task[]
}

export function BulkTaskProvider({ children, tasks }: BulkTaskProviderProps) {
  const [state, dispatch] = useReducer(bulkTaskReducer, initialState)
  
  // Memoize selected tasks to avoid unnecessary re-renders
  const selectedTasks = React.useMemo(() => {
    return tasks.filter(task => state.selectedTaskIds.has(task.id))
  }, [tasks, state.selectedTaskIds])
  
  const selectTask = useCallback((taskId: number) => {
    dispatch({ type: 'SELECT_TASK', taskId })
  }, [])
  
  const deselectTask = useCallback((taskId: number) => {
    dispatch({ type: 'DESELECT_TASK', taskId })
  }, [])
  
  const toggleTaskSelection = useCallback((taskId: number) => {
    dispatch({ type: 'TOGGLE_TASK', taskId })
  }, [])
  
  const selectAll = useCallback((tasks: Task[]) => {
    const taskIds = tasks.map(task => task.id)
    dispatch({ type: 'SELECT_ALL', taskIds })
  }, [])
  
  const selectAllInColumn = useCallback((columnTasks: Task[], status: TaskStatus) => {
    const taskIds = columnTasks
      .filter(task => task.status === status)
      .map(task => task.id)
    dispatch({ type: 'SELECT_COLUMN', taskIds })
  }, [])
  
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])
  
  const setSelectMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_SELECT_MODE', enabled })
  }, [])
  
  const setOperationInProgress = useCallback((inProgress: boolean, operation?: string) => {
    dispatch({ type: 'SET_OPERATION_IN_PROGRESS', inProgress, operation })
  }, [])
  
  const isSelected = useCallback((taskId: number) => {
    return state.selectedTaskIds.has(taskId)
  }, [state.selectedTaskIds])
  
  const contextValue: BulkTaskContextValue = {
    ...state,
    selectedTasks,
    selectedCount: state.selectedTaskIds.size,
    isSelected,
    canPerformBulkOperations: state.selectedTaskIds.size > 0 && !state.operationInProgress,
    selectTask,
    deselectTask,
    toggleTaskSelection,
    selectAll,
    selectAllInColumn,
    clearSelection,
    setSelectMode,
    setOperationInProgress,
  }
  
  return (
    <BulkTaskContext.Provider value={contextValue}>
      {children}
    </BulkTaskContext.Provider>
  )
}

export function useBulkTasks() {
  const context = useContext(BulkTaskContext)
  if (!context) {
    throw new Error('useBulkTasks must be used within a BulkTaskProvider')
  }
  return context
}

// Hook for keyboard shortcuts integration
export function useBulkTaskShortcuts() {
  const {
    selectAll,
    clearSelection,
    selectedCount,
    setSelectMode,
    isSelectMode,
  } = useBulkTasks()
  
  const handleSelectAllShortcut = useCallback((tasks: Task[]) => {
    if (selectedCount === tasks.length) {
      clearSelection()
    } else {
      selectAll(tasks)
    }
  }, [selectAll, clearSelection, selectedCount])
  
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(!isSelectMode)
  }, [setSelectMode, isSelectMode])
  
  return {
    handleSelectAllShortcut,
    handleToggleSelectMode,
    clearSelection,
    isSelectMode,
  }
}