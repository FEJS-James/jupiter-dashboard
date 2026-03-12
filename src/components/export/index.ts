// Main export components
export { ExportDialog } from './export-dialog'
export { ExportButton, TaskExportButton, ActivityExportButton } from './export-button'

// Analytics export components
export { AnalyticsExport, QuickAnalyticsExportButton } from './analytics-export'

// Kanban integration components
export { 
  KanbanExportIntegration,
  TaskListExportButton,
  ProjectExportButton,
  AgentTasksExportButton,
  StatusColumnExportButton,
  useKanbanExport
} from './kanban-export-integration'

// Utility functions
export * from '../../lib/export-utils'

// Type definitions for export functionality
export interface ExportResult {
  success: boolean
  filename?: string
  format: 'csv' | 'json'
  size?: number
  error?: string
}

export interface ExportConfiguration {
  id?: string
  name: string
  description?: string
  type: 'task-export' | 'report' | 'analytics'
  config: {
    format?: 'csv' | 'json'
    fields?: string[]
    filters?: Record<string, any>
    dateRange?: {
      start?: string
      end?: string
      preset?: string
    }
    sections?: string[]
    csvOptions?: {
      delimiter?: 'comma' | 'semicolon' | 'tab'
      encoding?: 'utf-8' | 'windows-1252'
      dateFormat?: 'iso' | 'us' | 'eu'
    }
    reportConfig?: {
      reportType?: string
      includeCharts?: boolean
    }
  }
  isDefault?: boolean
  lastUsed?: string
}

export interface ExportFilterOptions {
  project?: number
  status?: string[]
  priority?: string[]
  assignedAgent?: string
  tags?: string[]
  searchTerm?: string
  taskIds?: number[]
  dateRange?: {
    start?: string
    end?: string
    preset?: string
  }
}

export interface ReportSection {
  id: string
  label: string
  description: string
  enabled: boolean
}

// Export format type definitions
export type ExportFormat = 'csv' | 'json'
export type ExportType = 'task-export' | 'report' | 'analytics'
export type DateFormat = 'iso' | 'us' | 'eu'
export type CsvDelimiter = 'comma' | 'semicolon' | 'tab'
export type CsvEncoding = 'utf-8' | 'windows-1252'

// Common export configurations for quick access
export const COMMON_TASK_FIELDS = [
  { id: 'id', label: 'ID', enabled: true },
  { id: 'title', label: 'Title', enabled: true },
  { id: 'description', label: 'Description', enabled: false },
  { id: 'status', label: 'Status', enabled: true },
  { id: 'priority', label: 'Priority', enabled: true },
  { id: 'assignedAgent', label: 'Assigned Agent', enabled: true },
  { id: 'projectName', label: 'Project Name', enabled: true },
  { id: 'tags', label: 'Tags', enabled: true },
  { id: 'dueDate', label: 'Due Date', enabled: true },
  { id: 'createdAt', label: 'Created At', enabled: true },
  { id: 'updatedAt', label: 'Updated At', enabled: true },
] as const

export const COMMON_REPORT_SECTIONS = [
  { id: 'summary', label: 'Summary Overview', description: 'Key metrics and totals', enabled: true },
  { id: 'task-distribution', label: 'Task Distribution', description: 'Breakdown by status, priority, and project', enabled: true },
  { id: 'completion-trends', label: 'Completion Trends', description: 'Historical completion data', enabled: true },
  { id: 'agent-workload', label: 'Agent Workload', description: 'Task distribution across agents', enabled: false },
  { id: 'project-status', label: 'Project Status', description: 'Project-level metrics', enabled: false },
  { id: 'velocity-metrics', label: 'Velocity Metrics', description: 'Team velocity and throughput', enabled: false },
  { id: 'timeline-analysis', label: 'Timeline Analysis', description: 'Time-based insights', enabled: false },
  { id: 'risk-indicators', label: 'Risk Indicators', description: 'Overdue and stale tasks', enabled: false },
] as const

export const DATE_RANGE_PRESETS = [
  { id: 'last-7-days', label: 'Last 7 days' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
] as const

// Default export configurations
export const DEFAULT_TASK_EXPORT_CONFIG: ExportConfiguration = {
  name: 'Standard Task Export',
  description: 'Default task export with commonly used fields',
  type: 'task-export',
  config: {
    format: 'csv',
    fields: ['id', 'title', 'status', 'priority', 'assignedAgent', 'projectName', 'createdAt'],
    csvOptions: {
      delimiter: 'comma',
      encoding: 'utf-8',
      dateFormat: 'iso'
    }
  },
  isDefault: true
}

export const DEFAULT_REPORT_CONFIG: ExportConfiguration = {
  name: 'Standard Project Report',
  description: 'Default project report with overview and trends',
  type: 'report',
  config: {
    format: 'json',
    sections: ['summary', 'task-distribution', 'completion-trends'],
    reportConfig: {
      reportType: 'overview',
      includeCharts: false
    }
  },
  isDefault: true
}

// Utility functions for common export operations
export const createQuickExport = (
  data: any[],
  format: ExportFormat = 'csv',
  filename: string = 'export'
) => {
  // This would be implemented by calling the appropriate export utility functions
  // Implementation depends on the specific data structure
}

export const validateExportConfig = (config: ExportConfiguration): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!config.name?.trim()) {
    errors.push('Configuration name is required')
  }
  
  if (!config.type) {
    errors.push('Export type is required')
  }
  
  if (config.type === 'task-export' && (!config.config.fields || config.config.fields.length === 0)) {
    errors.push('At least one field must be selected for task export')
  }
  
  if (config.type === 'report' && (!config.config.sections || config.config.sections.length === 0)) {
    errors.push('At least one section must be selected for reports')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export hooks for React components
export interface UseExportOptions {
  onSuccess?: (result: ExportResult) => void
  onError?: (error: string) => void
}

export const useExport = (options: UseExportOptions = {}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  
  const exportData = React.useCallback(async (
    endpoint: string,
    payload: any,
    filename?: string
  ) => {
    setIsLoading(true)
    setProgress(0)
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }
      
      setProgress(90)
      
      // Handle file download
      const contentDisposition = response.headers.get('content-disposition')
      let downloadFilename = filename || 'export'
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      setProgress(100)
      
      const result: ExportResult = {
        success: true,
        filename: downloadFilename,
        format: payload.format || 'csv',
        size: blob.size
      }
      
      options.onSuccess?.(result)
      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      options.onError?.(errorMessage)
      
      return {
        success: false,
        format: payload.format || 'csv',
        error: errorMessage
      } as ExportResult
      
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }, [options])
  
  return {
    exportData,
    isLoading,
    progress
  }
}

// Re-export React for convenience in consuming components
import * as React from 'react'