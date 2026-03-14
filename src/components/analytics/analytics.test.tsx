import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useTheme
vi.mock('@/contexts/theme-context', () => ({
  useTheme: () => ({ actualTheme: 'light', theme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Recharts - it doesn't render in jsdom
vi.mock('recharts', () => {
  const MockChart = ({ children, ...props }: any) => <div data-testid="mock-chart" {...props}>{children}</div>
  const MockComponent = ({ children, ...props }: any) => <div {...props}>{children}</div>
  return {
    ResponsiveContainer: MockChart,
    LineChart: MockChart,
    AreaChart: MockChart,
    BarChart: MockChart,
    PieChart: MockChart,
    FunnelChart: MockChart,
    RadarChart: MockChart,
    Line: MockComponent,
    Area: MockComponent,
    Bar: MockComponent,
    Pie: MockComponent,
    Cell: MockComponent,
    Funnel: MockComponent,
    Radar: MockComponent,
    PolarGrid: MockComponent,
    PolarAngleAxis: MockComponent,
    PolarRadiusAxis: MockComponent,
    XAxis: MockComponent,
    YAxis: MockComponent,
    CartesianGrid: MockComponent,
    Tooltip: MockComponent,
    Legend: MockComponent,
    LabelList: MockComponent,
  }
})

// Mock date-fns to avoid timezone issues
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns')
  return {
    ...actual as any,
    format: (date: any, fmt: string) => '2026-03-01',
    parseISO: (str: string) => new Date(str),
    subDays: (date: Date, days: number) => new Date(date.getTime() - days * 86400000),
  }
})

import { CompletionAnalytics } from './completion-analytics'
import { VelocityCharts } from './velocity-charts'
import { AgentWorkloadCharts } from './agent-workload-charts'
import { AdditionalAnalytics } from './additional-analytics'

// ============================================================
// Safe Array Accessor Tests
// ============================================================
describe('CompletionAnalytics - safe array accessors', () => {
  it('renders without crashing with valid data', () => {
    const data = {
      completionByPriority: [
        { priority: 'High', total: 10, completed: 8, rate: 80 },
        { priority: 'Medium', total: 20, completed: 15, rate: 75 },
      ],
      completionByProject: [
        { projectName: 'Project A', total: 15, completed: 12, rate: 80 },
      ],
      statusDistribution: [
        { status: 'done', count: 30, percentage: 60 },
        { status: 'in-progress', count: 10, percentage: 20 },
      ],
      completionTimeHistogram: [
        { range: '1-3 days', count: 5 },
        { range: '3-7 days', count: 3 },
      ],
      stuckTasks: [
        { taskId: 1, title: 'Fix bug', status: 'in-progress', daysStuck: 10 },
      ],
    }

    const { container } = render(<CompletionAnalytics data={data} />)
    expect(container).toBeTruthy()
    // Check that overall completion percentage rendered
    expect(screen.getByText('78%')).toBeInTheDocument() // avg of 80 and 75
    // Check stuck tasks count
    expect(screen.getByText('1')).toBeInTheDocument()
    // Check stuck task title rendered
    expect(screen.getByText('Fix bug')).toBeInTheDocument()
  })

  it('handles null/undefined data gracefully', () => {
    const { container } = render(<CompletionAnalytics data={null as any} />)
    expect(container).toBeTruthy()
    // Should show 0% values for overall completion and best project rate
    const zeroPercents = screen.getAllByText('0%')
    expect(zeroPercents.length).toBeGreaterThanOrEqual(2)
  })

  it('handles empty arrays gracefully', () => {
    const data = {
      completionByPriority: [],
      completionByProject: [],
      statusDistribution: [],
      completionTimeHistogram: [],
      stuckTasks: [],
    }

    const { container } = render(<CompletionAnalytics data={data} />)
    expect(container).toBeTruthy()
    const zeroPercents = screen.getAllByText('0%')
    expect(zeroPercents.length).toBeGreaterThanOrEqual(2)
  })

  it('handles data with non-array fields gracefully', () => {
    const data = {
      completionByPriority: 'not-an-array' as any,
      completionByProject: null as any,
      statusDistribution: undefined as any,
      completionTimeHistogram: 42 as any,
      stuckTasks: {} as any,
    }

    const { container } = render(<CompletionAnalytics data={data} />)
    expect(container).toBeTruthy()
  })
})

// ============================================================
// VelocityCharts Tests
// ============================================================
describe('VelocityCharts - safe data accessors', () => {
  it('renders with valid data', () => {
    const data = {
      chartData: [
        { date: '2026-03-01', created: 5, completed: 3, net: 2, createdMA: 4, completedMA: 3 },
        { date: '2026-03-02', created: 3, completed: 4, net: -1, createdMA: 4, completedMA: 3 },
      ],
      metrics: {
        totalCreated: 8,
        totalCompleted: 7,
        avgDailyCreation: 4,
        avgDailyCompletion: 3.5,
        velocityTrend: 1,
        period: '30 days',
      },
    }

    const { container } = render(<VelocityCharts data={data} />)
    expect(container).toBeTruthy()
    expect(screen.getByText('8')).toBeInTheDocument() // totalCreated
    expect(screen.getByText('7')).toBeInTheDocument() // totalCompleted
  })

  it('handles null data gracefully', () => {
    const { container } = render(<VelocityCharts data={null as any} />)
    expect(container).toBeTruthy()
  })

  it('handles empty chartData', () => {
    const data = {
      chartData: [],
      metrics: {
        totalCreated: 0,
        totalCompleted: 0,
        avgDailyCreation: 0,
        avgDailyCompletion: 0,
        velocityTrend: 0,
        period: '30 days',
      },
    }

    const { container } = render(<VelocityCharts data={data} />)
    expect(container).toBeTruthy()
  })

  it('handles missing metrics gracefully', () => {
    const data = {
      chartData: [],
      metrics: undefined as any,
    }

    const { container } = render(<VelocityCharts data={data} />)
    expect(container).toBeTruthy()
  })
})

// ============================================================
// AgentWorkloadCharts Tests
// ============================================================
describe('AgentWorkloadCharts - safe data accessors', () => {
  it('renders with valid data', () => {
    const data = {
      workloadDistribution: [
        { agentName: 'coder', role: 'coder', color: '#10b981', status: 'available', totalTasks: 50, completedTasks: 40, inProgressTasks: 2, completionRate: 80 },
      ],
      productivityMetrics: [
        { agentName: 'coder', role: 'coder', tasksCompleted: 40, avgCompletionTime: 2.5 },
      ],
      workloadBalance: {
        agents: [
          { agentName: 'coder', role: 'coder', color: '#10b981', status: 'available', totalTasks: 50, completedTasks: 40, inProgressTasks: 2, completionRate: 80, workloadRatio: 5, isOverloaded: false, isUnderloaded: false },
        ],
        averageWorkload: 50,
        isBalanced: true,
      },
    }

    const { container } = render(<AgentWorkloadCharts data={data} />)
    expect(container).toBeTruthy()
  })

  it('handles null data gracefully', () => {
    const { container } = render(<AgentWorkloadCharts data={null as any} />)
    expect(container).toBeTruthy()
  })
})

// ============================================================
// AdditionalAnalytics Tests
// ============================================================
describe('AdditionalAnalytics - safe data accessors', () => {
  it('renders with valid data', () => {
    const data = {
      priorityDistribution: [
        { priority: 'High', count: 10, percentage: 50 },
        { priority: 'Medium', count: 10, percentage: 50 },
      ],
      commentEngagement: [
        { agentName: 'coder', role: 'coder', commentCount: 15, avgCommentLength: 50, engagementLevel: 'high' },
      ],
      activityHeatmap: {
        grid: [
          { day: 'Mon', dayIndex: 0, hours: [{ hour: 9, hourLabel: '9am', count: 5 }] },
        ],
        maxCount: 5,
      },
      leadTimeAnalysis: [],
      riskMetrics: {
        overdueTasksCount: 2,
        highPriorityUnassigned: 0,
        blockedTasksCount: 1,
        avgTaskAge: 5,
        riskLevel: 'medium' as const,
      },
    }

    const { container } = render(<AdditionalAnalytics data={data} />)
    expect(container).toBeTruthy()
  })

  it('handles null data gracefully', () => {
    const { container } = render(<AdditionalAnalytics data={null as any} />)
    expect(container).toBeTruthy()
  })
})
