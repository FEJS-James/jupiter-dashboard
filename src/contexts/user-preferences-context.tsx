'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { 
  UserPreferencesWithRelations, 
  PreferenceFormData, 
  PreferenceUpdateRequest,
  PreferenceBatchUpdateRequest,
  DEFAULT_USER_PREFERENCES 
} from '@/types'

interface UserPreferencesContextType {
  // State
  preferences: UserPreferencesWithRelations | null
  loading: boolean
  error: string | null
  
  // Actions
  loadPreferences: (agentId: number) => Promise<void>
  updatePreferences: (data: Partial<PreferenceFormData>) => Promise<void>
  updatePreference: (field: keyof UserPreferencesWithRelations, value: unknown) => Promise<void>
  batchUpdatePreferences: (updates: PreferenceBatchUpdateRequest['updates']) => Promise<void>
  resetPreferences: () => Promise<void>
  exportPreferences: (format?: string) => Promise<void>
  importPreferences: (importData: Partial<PreferenceFormData>, overwrite?: boolean) => Promise<void>
  
  // Utilities
  getPreference: <T,>(field: keyof UserPreferencesWithRelations, defaultValue?: T) => T
  isPreferenceDefault: (field: keyof UserPreferencesWithRelations) => boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}

interface UserPreferencesProviderProps {
  children: React.ReactNode
  agentId?: number
}

export function UserPreferencesProvider({ children, agentId }: UserPreferencesProviderProps): React.ReactElement {
  const [preferences, setPreferences] = useState<UserPreferencesWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for optimistic updates and error recovery
  const optimisticUpdate = useRef<UserPreferencesWithRelations | null>(null)
  const updateQueue = useRef<Array<() => Promise<void>>>([])
  const isProcessingQueue = useRef(false)
  
  // Process update queue to prevent race conditions
  const processUpdateQueue = useCallback(async () => {
    if (isProcessingQueue.current || updateQueue.current.length === 0) return
    
    isProcessingQueue.current = true
    
    while (updateQueue.current.length > 0) {
      const update = updateQueue.current.shift()
      if (update) {
        try {
          await update()
        } catch (error) {
          console.error('Failed to process preference update:', error)
        }
      }
    }
    
    isProcessingQueue.current = false
  }, [])
  
  // Load preferences from API
  const loadPreferences = useCallback(async (targetAgentId: number) => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/preferences?agentId=${targetAgentId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load preferences: ${response.statusText}`)
      }
      
      const data = await response.json()
      setPreferences(data)
      optimisticUpdate.current = data
      
      // Store in localStorage for offline access
      localStorage.setItem(`user-preferences-${targetAgentId}`, JSON.stringify(data))
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences'
      setError(errorMessage)
      
      // Try to load from localStorage as fallback
      try {
        const cached = localStorage.getItem(`user-preferences-${targetAgentId}`)
        if (cached) {
          const cachedData = JSON.parse(cached)
          setPreferences(cachedData)
          optimisticUpdate.current = cachedData
        }
      } catch (cacheError) {
        console.error('Failed to load cached preferences:', cacheError)
      }
    } finally {
      setLoading(false)
    }
  }, [loading])
  
  // Update preferences (full update)
  const updatePreferences = useCallback(async (data: Partial<PreferenceFormData>) => {
    if (!preferences || !agentId) return
    
    // Optimistic update
    const optimisticData = { ...preferences, ...data }
    optimisticUpdate.current = optimisticData
    setPreferences(optimisticData)
    
    const performUpdate = async () => {
      try {
        const response = await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, ...data }),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update preferences: ${response.statusText}`)
        }
        
        const updatedData = await response.json()
        setPreferences(updatedData)
        optimisticUpdate.current = updatedData
        setError(null)
        
        // Update localStorage
        localStorage.setItem(`user-preferences-${agentId}`, JSON.stringify(updatedData))
        
      } catch (err) {
        // Revert optimistic update on error
        setPreferences(preferences)
        optimisticUpdate.current = preferences
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
        setError(errorMessage)
        throw err
      }
    }
    
    updateQueue.current.push(performUpdate)
    await processUpdateQueue()
  }, [preferences, agentId, processUpdateQueue])
  
  // Update single preference field
  const updatePreference = useCallback(async (field: keyof UserPreferencesWithRelations, value: unknown) => {
    if (!preferences || !agentId) return
    
    // Optimistic update
    const optimisticData = { ...preferences, [field]: value }
    optimisticUpdate.current = optimisticData
    setPreferences(optimisticData)
    
    const performUpdate = async () => {
      try {
        const response = await fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            updates: [{ field, value }],
          }),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to update preference: ${response.statusText}`)
        }
        
        const updatedData = await response.json()
        
        // Merge the single field update with existing preferences
        const mergedData = { ...preferences, [field]: updatedData[field] }
        setPreferences(mergedData)
        optimisticUpdate.current = mergedData
        setError(null)
        
        // Update localStorage
        localStorage.setItem(`user-preferences-${agentId}`, JSON.stringify(mergedData))
        
      } catch (err) {
        // Revert optimistic update on error
        setPreferences(preferences)
        optimisticUpdate.current = preferences
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to update preference'
        setError(errorMessage)
        throw err
      }
    }
    
    updateQueue.current.push(performUpdate)
    await processUpdateQueue()
  }, [preferences, agentId, processUpdateQueue])
  
  // Batch update multiple preferences
  const batchUpdatePreferences = useCallback(async (updates: PreferenceBatchUpdateRequest['updates']) => {
    if (!preferences || !agentId || updates.length === 0) return
    
    // Optimistic update — use Record view for dynamic field assignment
    const optimisticData: UserPreferencesWithRelations = { ...preferences }
    const optimisticRecord = optimisticData as unknown as Record<string, unknown>
    updates.forEach(({ field, value }) => {
      optimisticRecord[field] = value
    })
    optimisticUpdate.current = optimisticData
    setPreferences(optimisticData)
    
    const performUpdate = async () => {
      try {
        const response = await fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, updates }),
        })
        
        if (!response.ok) {
          throw new Error(`Failed to batch update preferences: ${response.statusText}`)
        }
        
        const updatedData: UserPreferencesWithRelations = await response.json()
        
        // Merge batch updates with existing preferences
        const mergedData: UserPreferencesWithRelations = { ...preferences }
        const mergedRecord = mergedData as unknown as Record<string, unknown>
        const updatedRecord = updatedData as unknown as Record<string, unknown>
        updates.forEach(({ field }) => {
          mergedRecord[field] = updatedRecord[field]
        })
        
        setPreferences(mergedData)
        optimisticUpdate.current = mergedData
        setError(null)
        
        // Update localStorage
        localStorage.setItem(`user-preferences-${agentId}`, JSON.stringify(mergedData))
        
      } catch (err) {
        // Revert optimistic update on error
        setPreferences(preferences)
        optimisticUpdate.current = preferences
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to batch update preferences'
        setError(errorMessage)
        throw err
      }
    }
    
    updateQueue.current.push(performUpdate)
    await processUpdateQueue()
  }, [preferences, agentId, processUpdateQueue])
  
  // Reset preferences to defaults
  const resetPreferences = useCallback(async () => {
    if (!preferences || !agentId) return
    
    const performReset = async () => {
      try {
        const response = await fetch(`/api/preferences?agentId=${agentId}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          throw new Error(`Failed to reset preferences: ${response.statusText}`)
        }
        
        const resetData = await response.json()
        setPreferences(resetData)
        optimisticUpdate.current = resetData
        setError(null)
        
        // Update localStorage
        localStorage.setItem(`user-preferences-${agentId}`, JSON.stringify(resetData))
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reset preferences'
        setError(errorMessage)
        throw err
      }
    }
    
    updateQueue.current.push(performReset)
    await processUpdateQueue()
  }, [preferences, agentId, processUpdateQueue])
  
  // Export preferences
  const exportPreferences = useCallback(async (format = 'json') => {
    if (!agentId) return
    
    try {
      const response = await fetch(`/api/preferences/export?agentId=${agentId}&format=${format}`)
      
      if (!response.ok) {
        throw new Error(`Failed to export preferences: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from Content-Disposition header or generate one
      const disposition = response.headers.get('content-disposition')
      const filename = disposition 
        ? disposition.split('filename=')[1]?.replace(/"/g, '')
        : `preferences-${agentId}-${new Date().toISOString().split('T')[0]}.${format}`
      
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export preferences'
      setError(errorMessage)
      throw err
    }
  }, [agentId])
  
  // Import preferences
  const importPreferences = useCallback(async (importData: Partial<PreferenceFormData>, overwrite = false) => {
    if (!agentId) return
    
    try {
      const response = await fetch('/api/preferences/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, importData, overwrite }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to import preferences: ${response.statusText}`)
      }
      
      const updatedData = await response.json()
      setPreferences(updatedData)
      optimisticUpdate.current = updatedData
      setError(null)
      
      // Update localStorage
      localStorage.setItem(`user-preferences-${agentId}`, JSON.stringify(updatedData))
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import preferences'
      setError(errorMessage)
      throw err
    }
  }, [agentId])
  
  // Get preference value with fallback
  const getPreference = useCallback(<T,>(field: keyof UserPreferencesWithRelations, defaultValue?: T): T => {
    const currentPrefs = optimisticUpdate.current || preferences
    if (!currentPrefs) {
      return defaultValue !== undefined ? defaultValue : DEFAULT_USER_PREFERENCES[field] as T
    }
    
    const value = currentPrefs[field]
    return value !== undefined ? (value as T) : (defaultValue !== undefined ? defaultValue : DEFAULT_USER_PREFERENCES[field] as T)
  }, [preferences])
  
  // Check if preference is at default value
  const isPreferenceDefault = useCallback((field: keyof UserPreferencesWithRelations): boolean => {
    const currentPrefs = optimisticUpdate.current || preferences
    if (!currentPrefs) return true
    
    const currentValue = currentPrefs[field]
    const defaultValue = DEFAULT_USER_PREFERENCES[field]
    
    return JSON.stringify(currentValue) === JSON.stringify(defaultValue)
  }, [preferences])
  
  // Load preferences on mount or when agentId changes
  useEffect(() => {
    if (agentId) {
      loadPreferences(agentId)
    }
  }, [agentId, loadPreferences])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      updateQueue.current = []
    }
  }, [])
  
  const value: UserPreferencesContextType = {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
    updatePreference,
    batchUpdatePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    getPreference,
    isPreferenceDefault,
  }
  
  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  )
}