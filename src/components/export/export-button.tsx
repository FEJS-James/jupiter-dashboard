'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { ExportField, quickExport } from '@/lib/export-utils'
import { ExportDialog } from './export-dialog'
import { Task, Agent, Project } from '@/types'

interface ExportButtonProps {
  data: any[]
  fields: ExportField[]
  filename: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  label?: string
  showAdvanced?: boolean
  // Optional props for advanced export dialog
  tasks?: Task[]
  agents?: Agent[]
  projects?: Project[]
  selectedTaskIds?: number[]
  currentFilters?: any
}

export function ExportButton({ 
  data, 
  fields, 
  filename,
  variant = 'outline',
  size = 'sm',
  label,
  showAdvanced = false,
  tasks = [],
  agents = [],
  projects = [],
  selectedTaskIds = [],
  currentFilters = {}
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [exportType, setExportType] = useState<'csv' | 'json'>('csv')

  const handleQuickExport = async (format: 'csv' | 'json') => {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    setIsLoading(true)
    setExportType(format)

    try {
      await quickExport(data, fields, {
        format,
        filename,
        delimiter: 'comma',
        encoding: 'utf-8',
        dateFormat: 'iso'
      })
      
      toast.success(`${format.toUpperCase()} export completed successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAPIExport = async (format: 'csv' | 'json', endpoint: string, payload: any) => {
    setIsLoading(true)
    setExportType(format)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition')
      let downloadFilename = filename
      
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

      toast.success(`${format.toUpperCase()} export completed successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskExport = async (format: 'csv' | 'json') => {
    const payload = {
      format,
      fields: fields.map(f => f.key),
      filters: {
        ...currentFilters,
        taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined
      }
    }
    
    await handleAPIExport(format, '/api/export/tasks', payload)
  }

  const recordCount = data.length
  const hasSelection = selectedTaskIds.length > 0

  if (!showAdvanced) {
    // Simple export button with dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {label || 'Export'}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            Export {recordCount} record{recordCount !== 1 ? 's' : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleQuickExport('csv')}
            disabled={isLoading}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleQuickExport('json')}
            disabled={isLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Advanced export button with full dialog support
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {label || 'Export'}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {hasSelection 
            ? `Export ${selectedTaskIds.length} selected task${selectedTaskIds.length !== 1 ? 's' : ''}` 
            : `Export ${recordCount} task${recordCount !== 1 ? 's' : ''}`
          }
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Quick export options */}
        <DropdownMenuItem 
          onClick={() => handleTaskExport('csv')}
          disabled={isLoading}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Quick CSV Export
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleTaskExport('json')}
          disabled={isLoading}
        >
          <FileText className="h-4 w-4 mr-2" />
          Quick JSON Export
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Advanced export dialog */}
        <ExportDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Settings className="h-4 w-4 mr-2" />
              Advanced Export...
            </DropdownMenuItem>
          }
          tasks={tasks}
          agents={agents}
          projects={projects}
          selectedTaskIds={selectedTaskIds}
          currentFilters={currentFilters}
          onExportComplete={(result) => {
            toast.success(`${result.format.toUpperCase()} export completed successfully`)
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Specialized export buttons for common use cases

export function TaskExportButton({ 
  tasks, 
  selectedTaskIds = [], 
  currentFilters = {},
  agents = [],
  projects = [],
  variant = 'outline',
  size = 'sm' 
}: {
  tasks: Task[]
  selectedTaskIds?: number[]
  currentFilters?: any
  agents?: Agent[]
  projects?: Project[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}) {
  const taskFields: ExportField[] = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'description', label: 'Description', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'priority', label: 'Priority', type: 'string' },
    { key: 'assignedAgent', label: 'Assigned Agent', type: 'string' },
    { key: 'projectId', label: 'Project ID', type: 'number' },
    { key: 'tags', label: 'Tags', type: 'array' },
    { key: 'dueDate', label: 'Due Date', type: 'date' },
    { key: 'effort', label: 'Effort', type: 'number' },
    { key: 'createdAt', label: 'Created At', type: 'date' },
    { key: 'updatedAt', label: 'Updated At', type: 'date' },
  ]

  return (
    <ExportButton
      data={tasks}
      fields={taskFields}
      filename="tasks-export"
      variant={variant}
      size={size}
      showAdvanced={true}
      tasks={tasks}
      agents={agents}
      projects={projects}
      selectedTaskIds={selectedTaskIds}
      currentFilters={currentFilters}
    />
  )
}

export function ActivityExportButton({ 
  variant = 'outline',
  size = 'sm',
  currentFilters = {} 
}: {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  currentFilters?: any
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleActivityExport = async (format: 'csv' | 'json') => {
    setIsLoading(true)

    try {
      const queryParams = new URLSearchParams({
        format,
        ...currentFilters
      })

      const response = await fetch(`/api/activity/export?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `activity-export.${format}`
      
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

      toast.success(`Activity ${format.toUpperCase()} export completed`)
    } catch (error) {
      console.error('Activity export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Activity
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Activity Log</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleActivityExport('csv')}
          disabled={isLoading}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleActivityExport('json')}
          disabled={isLoading}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}