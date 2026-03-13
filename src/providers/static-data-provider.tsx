'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

interface StaticData {
  projects: any[]
  tasks: any[]
  agents: any[]
  activity: any[]
  agentDetails: Record<string, any>
  projectDetails: Record<string, any>
  taskDetails: Record<string, any>
  analyticsOverview: any
  analyticsCompletion: any
  analyticsVelocity: any
  analyticsAgents: any
  analyticsProjects: any
  analyticsAdditional: any
  activityStats: any
  notifications: any[]
  notificationStats: any
}

const StaticDataContext = createContext<StaticData | null>(null)

// URL pattern matchers for API routes
function matchRoute(pathname: string, data: StaticData): { matched: boolean; response: any } {
  // Remove query string for matching
  const path = pathname.split('?')[0]
  const params = new URLSearchParams(pathname.includes('?') ? pathname.split('?')[1] : '')

  // Projects
  if (path === '/api/projects') {
    return { matched: true, response: { success: true, data: data.projects } }
  }
  
  const projectMatch = path.match(/^\/api\/projects\/(\d+)$/)
  if (projectMatch) {
    const id = projectMatch[1]
    const project = data.projectDetails[id] || data.projects.find((p: any) => p.id === parseInt(id))
    return { matched: true, response: project ? { success: true, data: project } : { error: 'Not found' } }
  }

  // Tasks
  if (path === '/api/tasks') {
    let filtered = [...data.tasks]
    const projectFilter = params.get('project')
    const statusFilter = params.get('status')
    const agentFilter = params.get('agent')
    const priorityFilter = params.get('priority')
    const limitParam = params.get('limit')
    
    if (projectFilter) filtered = filtered.filter((t: any) => t.projectId === parseInt(projectFilter))
    if (statusFilter) filtered = filtered.filter((t: any) => t.status === statusFilter)
    if (agentFilter) filtered = filtered.filter((t: any) => t.assignedAgent === agentFilter)
    if (priorityFilter) filtered = filtered.filter((t: any) => t.priority === priorityFilter)
    if (limitParam) filtered = filtered.slice(0, parseInt(limitParam))
    
    return { matched: true, response: { success: true, data: filtered } }
  }

  const taskMatch = path.match(/^\/api\/tasks\/(\d+)$/)
  if (taskMatch) {
    const id = taskMatch[1]
    const task = data.taskDetails[id] || data.tasks.find((t: any) => t.id === parseInt(id))
    return { matched: true, response: task ? { success: true, data: task } : { error: 'Not found' } }
  }

  const taskActivityMatch = path.match(/^\/api\/tasks\/(\d+)\/activity$/)
  if (taskActivityMatch) {
    const id = taskActivityMatch[1]
    const detail = data.taskDetails[id]
    return { matched: true, response: { success: true, data: detail?.activity || [] } }
  }

  const taskCommentsMatch = path.match(/^\/api\/tasks\/(\d+)\/comments/)
  if (taskCommentsMatch) {
    const id = taskCommentsMatch[1]
    const detail = data.taskDetails[id]
    return { matched: true, response: { success: true, data: detail?.comments || [] } }
  }

  // Agents
  if (path === '/api/agents') {
    return { matched: true, response: { success: true, data: data.agents } }
  }

  const agentMatch = path.match(/^\/api\/agents\/(\d+)$/)
  if (agentMatch) {
    const id = agentMatch[1]
    const agent = data.agentDetails[id] || data.agents.find((a: any) => a.id === parseInt(id))
    return { matched: true, response: agent ? { success: true, data: agent } : { error: 'Not found' } }
  }

  const agentNotifMatch = path.match(/^\/api\/agents\/(\d+)\/notifications$/)
  if (agentNotifMatch) {
    return { matched: true, response: { success: true, data: [] } }
  }

  // Activity
  if (path === '/api/activity') {
    let items = [...data.activity]
    const limit = parseInt(params.get('limit') || '50')
    const projectId = params.get('projectId')
    const agentId = params.get('agentId')
    if (projectId) items = items.filter((a: any) => a.projectId === parseInt(projectId))
    if (agentId) items = items.filter((a: any) => a.agentId === parseInt(agentId))
    return { matched: true, response: { success: true, data: items.slice(0, limit) } }
  }

  if (path === '/api/activity/stats') {
    return { matched: true, response: { success: true, data: data.activityStats } }
  }

  if (path === '/api/activity/export') {
    return { matched: true, response: { success: true, data: data.activity } }
  }

  // Analytics
  if (path === '/api/analytics/overview') {
    return { matched: true, response: { success: true, data: data.analyticsOverview } }
  }
  if (path === '/api/analytics/completion') {
    return { matched: true, response: { success: true, data: data.analyticsCompletion } }
  }
  if (path === '/api/analytics/velocity') {
    return { matched: true, response: { success: true, data: data.analyticsVelocity } }
  }
  if (path === '/api/analytics/agents') {
    return { matched: true, response: { success: true, data: data.analyticsAgents } }
  }
  if (path === '/api/analytics/projects') {
    return { matched: true, response: { success: true, data: data.analyticsProjects } }
  }
  if (path === '/api/analytics/additional') {
    return { matched: true, response: { success: true, data: data.analyticsAdditional } }
  }

  // Notifications
  if (path === '/api/notifications') {
    return { matched: true, response: { success: true, data: data.notifications } }
  }
  if (path === '/api/notifications/stats') {
    return { matched: true, response: { success: true, data: data.notificationStats } }
  }
  if (path === '/api/notifications/read-all') {
    return { matched: true, response: { success: true, data: null } }
  }
  const notifIdMatch = path.match(/^\/api\/notifications\/(\d+)$/)
  if (notifIdMatch) {
    return { matched: true, response: { success: true, data: null } }
  }

  // Export endpoints (return empty/success)
  if (path.startsWith('/api/export/')) {
    return { matched: true, response: { success: true, data: [] } }
  }

  // Preferences (return defaults)
  if (path.startsWith('/api/preferences')) {
    return { matched: true, response: { success: true, data: null } }
  }

  // Socket (no-op)
  if (path === '/api/socket') {
    return { matched: true, response: { success: true } }
  }

  // Task bulk operations (no-op in static mode)
  if (path === '/api/tasks/bulk') {
    return { matched: true, response: { success: true, data: [] } }
  }

  // Task move (no-op)
  const taskMoveMatch = path.match(/^\/api\/tasks\/(\d+)\/move$/)
  if (taskMoveMatch) {
    return { matched: true, response: { success: true } }
  }

  return { matched: false, response: null }
}

let dataPromise: Promise<StaticData> | null = null

function loadStaticData(): Promise<StaticData> {
  if (!dataPromise) {
    dataPromise = fetch('/data.json').then(r => {
      if (!r.ok) throw new Error(`Failed to load /data.json: ${r.status}`)
      return r.json()
    })
  }
  return dataPromise
}

export function StaticDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StaticData | null>(null)

  useEffect(() => {
    // Patch global fetch to intercept /api/* calls
    const originalFetch = window.fetch
    
    window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let url: string
      if (typeof input === 'string') {
        url = input
      } else if (input instanceof URL) {
        url = input.pathname + input.search
      } else if (input instanceof Request) {
        url = new URL(input.url).pathname + new URL(input.url).search
      } else {
        return originalFetch(input, init)
      }

      // Only intercept /api/* calls
      if (!url.startsWith('/api/')) {
        return originalFetch(input, init)
      }

      // For write operations (POST, PUT, PATCH, DELETE), return success no-op
      const method = init?.method?.toUpperCase() || (input instanceof Request ? input.method : 'GET')
      if (method !== 'GET') {
        return new Response(JSON.stringify({ success: true, data: null, message: 'Static mode - write operations disabled' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const staticData = await loadStaticData()
        const { matched, response } = matchRoute(url, staticData)
        
        if (matched) {
          return new Response(JSON.stringify(response), {
            status: response?.error ? 404 : 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      } catch (err) {
        console.warn('[StaticData] Failed to serve from static data:', url, err)
      }

      // Fallback: return empty success for unmatched API routes
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load data for context
    loadStaticData().then(setData).catch(err => {
      console.error('[StaticData] Failed to load data.json:', err)
    })

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return (
    <StaticDataContext.Provider value={data}>
      {children}
    </StaticDataContext.Provider>
  )
}

export function useStaticData() {
  return useContext(StaticDataContext)
}
