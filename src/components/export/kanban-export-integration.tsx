'use client'

import React from 'react'
import { TaskExportButton } from './export-button'
import { ExportDialog } from './export-dialog'
import { Button } from '@/components/ui/button'
import { useBulkTasks } from '@/contexts/bulk-task-context'
import { Download, FileText, BarChart3 } from 'lucide-react'
import { Task, Agent, Project } from '@/types'

interface KanbanExportIntegrationProps {
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  currentFilters?: any
  className?: string
}

export function KanbanExportIntegration({
  tasks,
  agents,
  projects,
  currentFilters = {},
  className = ''
}: KanbanExportIntegrationProps) {
  const { selectedTaskIds, selectedCount, isSelectMode } = useBulkTasks()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quick Task Export */}
      <TaskExportButton
        tasks={tasks}
        selectedTaskIds={Array.from(selectedTaskIds)}
        currentFilters={currentFilters}
        agents={agents}
        projects={projects}
        variant="outline"
        size="sm"
      />

      {/* Reports Dialog */}
      <ExportDialog
        trigger={
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
        }
        tasks={tasks}
        agents={agents}
        projects={projects}
        selectedTaskIds={Array.from(selectedTaskIds)}
        currentFilters={currentFilters}
        onExportComplete={(result) => {
          console.log('Export completed:', result)
        }}
      />

      {/* Selection Status */}
      {isSelectMode && selectedCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>
      )}
    </div>
  )
}

// Hook for integrating export functionality with existing components
export function useKanbanExport(
  tasks: Task[],
  agents: Agent[],
  projects: Project[],
  currentFilters: any = {}
) {
  const { selectedTaskIds } = useBulkTasks()

  const exportCurrentView = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const payload = {
        format,
        filters: {
          ...currentFilters,
          taskIds: selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : undefined
        }
      }

      const response = await fetch('/api/export/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `tasks-export.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true, filename, format }
    } catch (error) {
      console.error('Export error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  const exportSelected = async (format: 'csv' | 'json' = 'csv') => {
    if (selectedTaskIds.size === 0) {
      throw new Error('No tasks selected for export')
    }
    return exportCurrentView(format)
  }

  const exportAll = async (format: 'csv' | 'json' = 'csv') => {
    const payload = {
      format,
      filters: currentFilters
    }

    try {
      const response = await fetch('/api/export/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download similar to above
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `all-tasks-export.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true, filename, format }
    } catch (error) {
      console.error('Export error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  const generateReport = async (reportType: string = 'overview', format: 'csv' | 'json' = 'json') => {
    try {
      const payload = {
        reportType,
        format,
        filters: currentFilters,
        sections: ['summary', 'task-distribution', 'completion-trends', 'agent-workload']
      }

      const response = await fetch('/api/export/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`)
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${reportType}-report.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      return { success: true, filename, format, reportType }
    } catch (error) {
      console.error('Report generation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  return {
    exportCurrentView,
    exportSelected,
    exportAll,
    generateReport,
    selectedCount: selectedTaskIds.size,
    hasSelection: selectedTaskIds.size > 0,
    totalTasks: tasks.length
  }
}

// Specialized export components for different contexts

export function TaskListExportButton({
  tasks,
  agents,
  projects,
  variant = 'outline'
}: {
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  variant?: 'default' | 'outline' | 'ghost'
}) {
  return (
    <TaskExportButton
      tasks={tasks}
      agents={agents}
      projects={projects}
      variant={variant}
      size="sm"
    />
  )
}

export function ProjectExportButton({
  projectId,
  tasks,
  agents,
  projects,
  variant = 'outline'
}: {
  projectId: number
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  variant?: 'default' | 'outline' | 'ghost'
}) {
  const projectTasks = tasks.filter(task => task.projectId === projectId)
  const currentFilters = { project: projectId.toString() }

  return (
    <TaskExportButton
      tasks={projectTasks}
      agents={agents}
      projects={projects}
      currentFilters={currentFilters}
      variant={variant}
      size="sm"
    />
  )
}

export function AgentTasksExportButton({
  agentName,
  tasks,
  agents,
  projects,
  variant = 'outline'
}: {
  agentName: string
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  variant?: 'default' | 'outline' | 'ghost'
}) {
  const agentTasks = tasks.filter(task => task.assignedAgent === agentName)
  const currentFilters = { assignedAgent: agentName }

  return (
    <TaskExportButton
      tasks={agentTasks}
      agents={agents}
      projects={projects}
      currentFilters={currentFilters}
      variant={variant}
      size="sm"
    />
  )
}

export function StatusColumnExportButton({
  status,
  tasks,
  agents,
  projects,
  variant = 'ghost'
}: {
  status: string
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  variant?: 'default' | 'outline' | 'ghost'
}) {
  const statusTasks = tasks.filter(task => task.status === status)
  const currentFilters = { status: [status] }

  if (statusTasks.length === 0) return null

  return (
    <TaskExportButton
      tasks={statusTasks}
      agents={agents}
      projects={projects}
      currentFilters={currentFilters}
      variant={variant}
      size="sm"
    />
  )
}