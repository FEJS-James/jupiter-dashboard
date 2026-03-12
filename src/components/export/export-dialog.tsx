'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Download, 
  FileText, 
  Settings, 
  Save, 
  Trash2, 
  Clock,
  Filter,
  FileSpreadsheet,
  Calendar,
  Users,
  BarChart3,
  Loader2
} from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { Task, Agent, Project } from '@/types'

interface ExportDialogProps {
  trigger?: React.ReactNode
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  selectedTaskIds?: number[]
  currentFilters?: any
  onExportComplete?: (result: any) => void
}

interface ExportConfig {
  id?: string
  name: string
  description?: string
  type: 'task-export' | 'report'
  config: any
  isDefault?: boolean
  lastUsed?: string
}

const DEFAULT_TASK_FIELDS = [
  { id: 'id', label: 'ID', enabled: true },
  { id: 'title', label: 'Title', enabled: true },
  { id: 'description', label: 'Description', enabled: false },
  { id: 'status', label: 'Status', enabled: true },
  { id: 'priority', label: 'Priority', enabled: true },
  { id: 'assignedAgent', label: 'Assigned Agent', enabled: true },
  { id: 'agentName', label: 'Agent Name', enabled: false },
  { id: 'agentRole', label: 'Agent Role', enabled: false },
  { id: 'projectId', label: 'Project ID', enabled: false },
  { id: 'projectName', label: 'Project Name', enabled: true },
  { id: 'tags', label: 'Tags', enabled: true },
  { id: 'dueDate', label: 'Due Date', enabled: true },
  { id: 'effort', label: 'Effort', enabled: false },
  { id: 'dependencies', label: 'Dependencies', enabled: false },
  { id: 'createdAt', label: 'Created At', enabled: true },
  { id: 'updatedAt', label: 'Updated At', enabled: true },
]

const REPORT_SECTIONS = [
  { id: 'summary', label: 'Summary Overview', description: 'Key metrics and totals' },
  { id: 'task-distribution', label: 'Task Distribution', description: 'Breakdown by status, priority, and project' },
  { id: 'completion-trends', label: 'Completion Trends', description: 'Historical completion data' },
  { id: 'agent-workload', label: 'Agent Workload', description: 'Task distribution across agents' },
  { id: 'project-status', label: 'Project Status', description: 'Project-level metrics' },
  { id: 'velocity-metrics', label: 'Velocity Metrics', description: 'Team velocity and throughput' },
  { id: 'timeline-analysis', label: 'Timeline Analysis', description: 'Time-based insights' },
  { id: 'risk-indicators', label: 'Risk Indicators', description: 'Overdue and stale tasks' },
]

const DATE_PRESETS = [
  { id: 'last-7-days', label: 'Last 7 days' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
]

export function ExportDialog({ 
  trigger, 
  tasks, 
  agents, 
  projects, 
  selectedTaskIds = [], 
  currentFilters = {},
  onExportComplete 
}: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'tasks' | 'reports'>('tasks')
  const [isLoading, setIsLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  // Task Export State
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [selectedFields, setSelectedFields] = useState(
    DEFAULT_TASK_FIELDS.reduce((acc, field) => ({
      ...acc,
      [field.id]: field.enabled
    }), {} as Record<string, boolean>)
  )
  
  // Filters State
  const [dateRange, setDateRange] = useState<{
    preset?: string
    start?: string
    end?: string
  }>({})
  const [filters, setFilters] = useState({
    project: currentFilters.project || '',
    status: currentFilters.status || [],
    priority: currentFilters.priority || [],
    assignedAgent: currentFilters.assignedAgent || '',
    tags: currentFilters.tags || [],
    searchTerm: currentFilters.searchTerm || '',
  })
  
  // CSV Options State
  const [csvOptions, setCsvOptions] = useState({
    delimiter: 'comma' as 'comma' | 'semicolon' | 'tab',
    encoding: 'utf-8' as 'utf-8' | 'windows-1252',
    dateFormat: 'iso' as 'iso' | 'us' | 'eu',
  })
  
  // Report State
  const [reportType, setReportType] = useState<'overview' | 'project-health' | 'agent-performance' | 'velocity' | 'custom'>('overview')
  const [reportSections, setReportSections] = useState(
    REPORT_SECTIONS.slice(0, 3).reduce((acc, section) => ({
      ...acc,
      [section.id]: true
    }), {} as Record<string, boolean>)
  )
  const [includeCharts, setIncludeCharts] = useState(false)
  
  // Saved Configurations
  const [savedConfigs, setSavedConfigs] = useState<ExportConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const [saveConfigName, setSaveConfigName] = useState('')
  const [saveConfigDescription, setSaveConfigDescription] = useState('')
  const [showSaveConfig, setShowSaveConfig] = useState(false)

  // Load saved configurations
  useEffect(() => {
    if (open) {
      loadSavedConfigurations()
    }
  }, [open, activeTab])

  const loadSavedConfigurations = async () => {
    try {
      const response = await fetch(`/api/export/config?type=${activeTab === 'tasks' ? 'task-export' : 'report'}`)
      if (response.ok) {
        const result = await response.json()
        setSavedConfigs(result.data || [])
      }
    } catch (error) {
      console.error('Failed to load configurations:', error)
    }
  }

  const applyConfiguration = (config: ExportConfig) => {
    if (config.type === 'task-export') {
      if (config.config.format) setExportFormat(config.config.format)
      if (config.config.fields) {
        const fieldState = DEFAULT_TASK_FIELDS.reduce((acc, field) => ({
          ...acc,
          [field.id]: config.config.fields.includes(field.id)
        }), {} as Record<string, boolean>)
        setSelectedFields(fieldState)
      }
      if (config.config.filters) setFilters(config.config.filters)
      if (config.config.csvOptions) setCsvOptions(config.config.csvOptions)
    } else {
      if (config.config.reportConfig?.reportType) setReportType(config.config.reportConfig.reportType)
      if (config.config.reportConfig?.sections) {
        const sectionState = REPORT_SECTIONS.reduce((acc, section) => ({
          ...acc,
          [section.id]: config.config.reportConfig.sections.includes(section.id)
        }), {} as Record<string, boolean>)
        setReportSections(sectionState)
      }
      if (config.config.reportConfig?.includeCharts !== undefined) {
        setIncludeCharts(config.config.reportConfig.includeCharts)
      }
    }

    // Update last used
    fetch(`/api/export/config?id=${config.id}&action=use`, { method: 'PATCH' })
      .catch(console.error)

    setSelectedConfig(config.id || '')
  }

  const saveConfiguration = async () => {
    if (!saveConfigName.trim()) {
      toast.error('Please enter a configuration name')
      return
    }

    try {
      const configData = {
        name: saveConfigName,
        description: saveConfigDescription,
        type: activeTab === 'tasks' ? 'task-export' : 'report',
        config: activeTab === 'tasks' ? {
          format: exportFormat,
          fields: Object.keys(selectedFields).filter(field => selectedFields[field]),
          filters,
          csvOptions,
        } : {
          reportConfig: {
            reportType,
            sections: Object.keys(reportSections).filter(section => reportSections[section]),
            includeCharts,
          },
          filters,
        }
      }

      const response = await fetch('/api/export/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      })

      if (response.ok) {
        toast.success('Configuration saved successfully')
        setSaveConfigName('')
        setSaveConfigDescription('')
        setShowSaveConfig(false)
        loadSavedConfigurations()
      } else {
        toast.error('Failed to save configuration')
      }
    } catch (error) {
      console.error('Save configuration error:', error)
      toast.error('Failed to save configuration')
    }
  }

  const deleteConfiguration = async (configId: string) => {
    try {
      const response = await fetch(`/api/export/config?id=${configId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Configuration deleted')
        loadSavedConfigurations()
        if (selectedConfig === configId) {
          setSelectedConfig('')
        }
      } else {
        toast.error('Failed to delete configuration')
      }
    } catch (error) {
      console.error('Delete configuration error:', error)
      toast.error('Failed to delete configuration')
    }
  }

  const handleExport = async () => {
    setIsLoading(true)
    setExportProgress(0)

    try {
      let url: string
      let payload: any

      if (activeTab === 'tasks') {
        url = '/api/export/tasks'
        payload = {
          format: exportFormat,
          fields: Object.keys(selectedFields).filter(field => selectedFields[field]),
          dateRange: dateRange.preset ? { preset: dateRange.preset } : {
            start: dateRange.start,
            end: dateRange.end
          },
          filters: {
            ...filters,
            taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined
          },
          ...csvOptions,
          limit: 50000
        }
      } else {
        url = '/api/export/reports'
        payload = {
          reportType,
          format: exportFormat,
          dateRange: dateRange.preset ? { preset: dateRange.preset } : {
            start: dateRange.start,
            end: dateRange.end
          },
          filters,
          sections: Object.keys(reportSections).filter(section => reportSections[section]),
          includeCharts,
        }
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      clearInterval(progressInterval)
      setExportProgress(100)

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      // Handle file download
      const contentType = response.headers.get('content-type')
      const contentDisposition = response.headers.get('content-disposition')
      
      let filename = 'export'
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

      toast.success('Export completed successfully')
      onExportComplete?.({ format: exportFormat, filename, size: blob.size })

      setTimeout(() => {
        setOpen(false)
        setExportProgress(0)
      }, 1000)

    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getSelectedTaskCount = () => {
    if (selectedTaskIds.length > 0) return selectedTaskIds.length
    
    // Apply current filters to get estimated count
    let filteredTasks = tasks
    
    if (filters.project) {
      filteredTasks = filteredTasks.filter(task => task.projectId === parseInt(filters.project))
    }
    if (filters.status.length > 0) {
      filteredTasks = filteredTasks.filter(task => filters.status.includes(task.status))
    }
    if (filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task => filters.priority.includes(task.priority))
    }
    if (filters.assignedAgent) {
      filteredTasks = filteredTasks.filter(task => task.assignedAgent === filters.assignedAgent)
    }
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase()
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(search) ||
        (task.description && task.description.toLowerCase().includes(search))
      )
    }
    
    return filteredTasks.length
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export & Reports
          </DialogTitle>
          <DialogDescription>
            Export task data or generate comprehensive project reports
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tasks' | 'reports')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Task Export
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Saved Configurations Section */}
          {savedConfigs.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Saved Configurations</CardTitle>
                <CardDescription className="text-xs">
                  Quick access to your saved export settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {savedConfigs.map(config => (
                    <div key={config.id} className="flex items-center gap-1">
                      <Button
                        variant={selectedConfig === config.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyConfiguration(config)}
                        className="text-xs"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {config.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConfiguration(config.id!)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Format</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'json')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                    <SelectItem value="json">JSON (JavaScript Object Notation)</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fields to Export</CardTitle>
                <CardDescription className="text-xs">
                  Select which task fields to include in your export
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_TASK_FIELDS.map(field => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields[field.id]}
                        onCheckedChange={(checked) => 
                          setSelectedFields(prev => ({
                            ...prev,
                            [field.id]: checked as boolean
                          }))
                        }
                      />
                      <Label htmlFor={field.id} className="text-sm">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {exportFormat === 'csv' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">CSV Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm">Delimiter</Label>
                    <Select 
                      value={csvOptions.delimiter} 
                      onValueChange={(value) => setCsvOptions(prev => ({ ...prev, delimiter: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comma">Comma (,)</SelectItem>
                        <SelectItem value="semicolon">Semicolon (;)</SelectItem>
                        <SelectItem value="tab">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Encoding</Label>
                    <Select 
                      value={csvOptions.encoding} 
                      onValueChange={(value) => setCsvOptions(prev => ({ ...prev, encoding: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="windows-1252">Windows-1252</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Date Format</Label>
                    <Select 
                      value={csvOptions.dateFormat} 
                      onValueChange={(value) => setCsvOptions(prev => ({ ...prev, dateFormat: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iso">ISO 8601 (2024-01-01)</SelectItem>
                        <SelectItem value="us">US Format (01/01/2024)</SelectItem>
                        <SelectItem value="eu">EU Format (01.01.2024)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Report Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={reportType} onValueChange={(value) => setReportType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview Report</SelectItem>
                    <SelectItem value="project-health">Project Health Report</SelectItem>
                    <SelectItem value="agent-performance">Agent Performance Report</SelectItem>
                    <SelectItem value="velocity">Velocity Report</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Report Sections</CardTitle>
                <CardDescription className="text-xs">
                  Choose which sections to include in your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REPORT_SECTIONS.map(section => (
                    <div key={section.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={section.id}
                        checked={reportSections[section.id]}
                        onCheckedChange={(checked) => 
                          setReportSections(prev => ({
                            ...prev,
                            [section.id]: checked as boolean
                          }))
                        }
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor={section.id} className="text-sm font-medium">
                          {section.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Additional Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <Label htmlFor="includeCharts" className="text-sm">
                    Include chart data (JSON format only)
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Preset Range</Label>
              <Select 
                value={dateRange.preset || ''} 
                onValueChange={(value) => {
                  if (value) {
                    setDateRange({ preset: value, start: undefined, end: undefined })
                  } else {
                    setDateRange({})
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset or use custom dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom date range</SelectItem>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!dateRange.preset && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="datetime-local"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Project</Label>
                <Select 
                  value={filters.project} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, project: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Assigned Agent</Label>
                <Select 
                  value={filters.assignedAgent} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, assignedAgent: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All agents</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.name}>
                        {agent.name} ({agent.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Search Term</Label>
              <Input
                placeholder="Search in title and description"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span>Estimated tasks to export:</span>
              <Badge variant="secondary">
                {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} selected` : `~${getSelectedTaskCount()}`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Configuration Section */}
        {showSaveConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Save Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Configuration Name</Label>
                <Input
                  placeholder="e.g., Weekly Task Export"
                  value={saveConfigName}
                  onChange={(e) => setSaveConfigName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Description (Optional)</Label>
                <Textarea
                  placeholder="Describe this configuration for future reference"
                  value={saveConfigDescription}
                  onChange={(e) => setSaveConfigDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveConfiguration} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowSaveConfig(false)} 
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generating export...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {!showSaveConfig && (
              <Button 
                variant="outline" 
                onClick={() => setShowSaveConfig(true)}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Config
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isLoading || Object.keys(selectedFields).filter(k => selectedFields[k]).length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}