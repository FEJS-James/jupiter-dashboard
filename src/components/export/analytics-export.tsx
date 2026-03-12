'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Calendar,
  FileSpreadsheet,
  FileText,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format, subDays, subWeeks, subMonths } from 'date-fns'

interface AnalyticsExportProps {
  trigger?: React.ReactNode
  onExportComplete?: (result: any) => void
}

const ANALYTICS_SECTIONS = [
  { 
    id: 'overview', 
    label: 'Overview Metrics',
    description: 'Total tasks, completion rates, and key performance indicators',
    icon: BarChart3
  },
  { 
    id: 'completion-trends', 
    label: 'Completion Trends',
    description: 'Task completion over time, velocity metrics',
    icon: TrendingUp
  },
  { 
    id: 'project-analytics', 
    label: 'Project Analytics',
    description: 'Project-specific metrics and performance data',
    icon: PieChart
  },
  { 
    id: 'agent-analytics', 
    label: 'Agent Analytics',
    description: 'Individual agent performance and workload distribution',
    icon: Users
  },
  { 
    id: 'velocity-metrics', 
    label: 'Velocity Metrics',
    description: 'Sprint velocity, throughput, and productivity trends',
    icon: Calendar
  }
]

const DATE_RANGES = [
  { id: 'last-7-days', label: 'Last 7 days' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'last-6-months', label: 'Last 6 months' },
  { id: 'year-to-date', label: 'Year to date' },
  { id: 'all-time', label: 'All time' }
]

export function AnalyticsExport({ trigger, onExportComplete }: AnalyticsExportProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [dateRange, setDateRange] = useState('last-30-days')
  const [selectedSections, setSelectedSections] = useState<Record<string, boolean>>({
    overview: true,
    'completion-trends': true,
    'project-analytics': false,
    'agent-analytics': false,
    'velocity-metrics': false,
  })
  const [includeChartData, setIncludeChartData] = useState(false)
  const [includeRawData, setIncludeRawData] = useState(false)

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionId]: enabled
    }))
  }

  const getSelectedSectionCount = () => {
    return Object.values(selectedSections).filter(Boolean).length
  }

  const getDateRangeParams = (rangeId: string) => {
    const now = new Date()
    
    switch (rangeId) {
      case 'last-7-days':
        return { startDate: subDays(now, 7).toISOString(), endDate: now.toISOString() }
      case 'last-30-days':
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() }
      case 'last-3-months':
        return { startDate: subMonths(now, 3).toISOString(), endDate: now.toISOString() }
      case 'last-6-months':
        return { startDate: subMonths(now, 6).toISOString(), endDate: now.toISOString() }
      case 'year-to-date':
        return { 
          startDate: new Date(now.getFullYear(), 0, 1).toISOString(), 
          endDate: now.toISOString() 
        }
      case 'all-time':
        return {}
      default:
        return { startDate: subDays(now, 30).toISOString(), endDate: now.toISOString() }
    }
  }

  const fetchAnalyticsData = async (endpoint: string, params: any = {}) => {
    const searchParams = new URLSearchParams(params)
    const response = await fetch(`${endpoint}?${searchParams}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
    }
    
    return response.json()
  }

  const gatherAnalyticsData = async () => {
    const dateParams = getDateRangeParams(dateRange)
    const analyticsData: Record<string, any> = {}

    // Fetch each selected section's data
    if (selectedSections.overview) {
      setExportProgress(20)
      analyticsData.overview = await fetchAnalyticsData('/api/analytics/overview', dateParams)
    }

    if (selectedSections['completion-trends']) {
      setExportProgress(40)
      analyticsData.completionTrends = await fetchAnalyticsData('/api/analytics/completion', dateParams)
    }

    if (selectedSections['project-analytics']) {
      setExportProgress(60)
      analyticsData.projectAnalytics = await fetchAnalyticsData('/api/analytics/projects', dateParams)
    }

    if (selectedSections['agent-analytics']) {
      setExportProgress(80)
      analyticsData.agentAnalytics = await fetchAnalyticsData('/api/analytics/agents', dateParams)
    }

    if (selectedSections['velocity-metrics']) {
      setExportProgress(90)
      analyticsData.velocityMetrics = await fetchAnalyticsData('/api/analytics/velocity', dateParams)
    }

    return analyticsData
  }

  const handleExport = async () => {
    if (getSelectedSectionCount() === 0) {
      toast.error('Please select at least one analytics section')
      return
    }

    setIsLoading(true)
    setExportProgress(0)

    try {
      // Gather analytics data from multiple endpoints
      const analyticsData = await gatherAnalyticsData()
      
      setExportProgress(95)

      // Prepare export payload
      const exportPayload = {
        reportType: 'analytics-export',
        format: exportFormat,
        dateRange: {
          preset: dateRange,
          ...getDateRangeParams(dateRange)
        },
        sections: Object.keys(selectedSections).filter(key => selectedSections[key]),
        includeCharts: includeChartData,
        data: analyticsData,
        metadata: {
          exportedAt: new Date().toISOString(),
          dateRange: dateRange,
          sectionsIncluded: Object.keys(selectedSections).filter(key => selectedSections[key]),
          includeChartData,
          includeRawData
        }
      }

      if (exportFormat === 'json') {
        // Direct JSON download
        const jsonContent = JSON.stringify(exportPayload, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const filename = `analytics-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
        
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        setExportProgress(100)
        toast.success('Analytics export completed successfully')
        onExportComplete?.({ format: 'json', filename, size: blob.size })
      } else {
        // Use reports API for CSV format
        const response = await fetch('/api/export/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportPayload),
        })

        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`)
        }

        // Handle file download
        const contentDisposition = response.headers.get('content-disposition')
        let filename = `analytics-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
        
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

        setExportProgress(100)
        toast.success('Analytics export completed successfully')
        onExportComplete?.({ format: 'csv', filename, size: blob.size })
      }

      setTimeout(() => {
        setOpen(false)
        setExportProgress(0)
      }, 1000)

    } catch (error) {
      console.error('Analytics export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Analytics
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Export Analytics Data
          </DialogTitle>
          <DialogDescription>
            Export comprehensive analytics data including metrics, trends, and performance reports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export Format</CardTitle>
              <CardDescription className="text-xs">
                Choose the format for your analytics export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'json' | 'csv')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON (Structured Data)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Spreadsheet Compatible)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Range Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Date Range</CardTitle>
              <CardDescription className="text-xs">
                Select the time period for analytics data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(range => (
                    <SelectItem key={range.id} value={range.id}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Analytics Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Analytics Sections</CardTitle>
              <CardDescription className="text-xs">
                Choose which analytics data to include in your export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ANALYTICS_SECTIONS.map(section => {
                  const Icon = section.icon
                  return (
                    <div key={section.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={section.id}
                        checked={selectedSections[section.id]}
                        onCheckedChange={(checked) => 
                          handleSectionToggle(section.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={section.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Icon className="h-4 w-4" />
                          {section.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeChartData"
                  checked={includeChartData}
                  onCheckedChange={(checked) => setIncludeChartData(checked as boolean)}
                />
                <Label htmlFor="includeChartData" className="text-sm">
                  Include chart/visualization data (JSON format only)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRawData"
                  checked={includeRawData}
                  onCheckedChange={(checked) => setIncludeRawData(checked as boolean)}
                />
                <Label htmlFor="includeRawData" className="text-sm">
                  Include raw data points for analysis
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Export Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <span>Selected sections:</span>
                <span className="font-medium">
                  {getSelectedSectionCount()} of {ANALYTICS_SECTIONS.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Date range:</span>
                <span className="font-medium">
                  {DATE_RANGES.find(r => r.id === dateRange)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>Format:</span>
                <span className="font-medium uppercase">
                  {exportFormat}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating analytics export...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isLoading || getSelectedSectionCount() === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Analytics
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Quick analytics export button for toolbar/header integration
export function QuickAnalyticsExportButton({
  variant = 'outline',
  size = 'sm',
  showLabel = true
}: {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showLabel?: boolean
}) {
  return (
    <AnalyticsExport
      trigger={
        <Button variant={variant} size={size}>
          <BarChart3 className="h-4 w-4 mr-2" />
          {showLabel ? 'Export Analytics' : ''}
        </Button>
      }
      onExportComplete={(result) => {
        console.log('Analytics export completed:', result)
      }}
    />
  )
}