'use client'

import { ReactNode, useEffect, useState } from 'react'

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

// URL pattern matchers for API routes
function matchRoute(pathname: string, data: StaticData): { matched: boolean; response: any } {
  const path = pathname.split('?')[0]
  const params = new URLSearchParams(pathname.includes('?') ? pathname.split('?')[1] : '')

  if (path === '/api/projects') {
    return { matched: true, response: { success: true, data: data.projects } }
  }
  const projectMatch = path.match(/^\/api\/projects\/(\d+)$/)
  if (projectMatch) {
    const id = projectMatch[1]
    const project = data.projectDetails[id] || data.projects.find((p: any) => p.id === parseInt(id))
    return { matched: true, response: project ? { success: true, data: project } : { error: 'Not found' } }
  }
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
  if (path === '/api/agents') {
    return { matched: true, response: { success: true, data: data.agents } }
  }
  const agentMatch = path.match(/^\/api\/agents\/(\d+)$/)
  if (agentMatch) {
    const id = agentMatch[1]
    const agent = data.agentDetails[id] || data.agents.find((a: any) => a.id === parseInt(id))
    return { matched: true, response: agent ? { success: true, data: agent } : { error: 'Not found' } }
  }
  if (path.match(/^\/api\/agents\/\d+\/notifications$/)) {
    return { matched: true, response: { success: true, data: [] } }
  }
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
  if (path === '/api/notifications') {
    return { matched: true, response: { success: true, data: data.notifications || [] } }
  }
  if (path === '/api/notifications/stats') {
    return { matched: true, response: { success: true, data: data.notificationStats || { unreadCount: 0, totalCount: 0, byType: {}, byPriority: {} } } }
  }
  if (path === '/api/notifications/read-all' || path.match(/^\/api\/notifications\/\d+$/)) {
    return { matched: true, response: { success: true, data: null } }
  }
  if (path.startsWith('/api/export/') || path.startsWith('/api/preferences') || path === '/api/socket' || path === '/api/tasks/bulk' || path.match(/^\/api\/tasks\/\d+\/move$/)) {
    return { matched: true, response: { success: true, data: null } }
  }
  return { matched: false, response: null }
}

// Immediately patch fetch at module load time (before any effects run)
let staticDataCache: StaticData | null = null
let staticDataPromise: Promise<StaticData> | null = null
let originalFetch: typeof fetch | null = null
let patched = false

function ensurePatch() {
  if (patched || typeof window === 'undefined') return
  patched = true
  originalFetch = window.fetch.bind(window)
  
  function loadStaticData(): Promise<StaticData> {
    if (staticDataCache) return Promise.resolve(staticDataCache)
    if (!staticDataPromise) {
      staticDataPromise = originalFetch!('/data.json').then(r => {
        if (!r.ok) throw new Error(`Failed to load /data.json: ${r.status}`)
        return r.json()
      }).then(data => {
        staticDataCache = data
        return data
      })
    }
    return staticDataPromise
  }

  // Preload immediately
  loadStaticData()

  window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.pathname + input.search
    } else if (input instanceof Request) {
      const u = new URL(input.url)
      url = u.pathname + u.search
    } else {
      return originalFetch!(input, init)
    }

    if (!url.startsWith('/api/')) {
      return originalFetch!(input, init)
    }

    // For write operations, return success no-op
    const method = init?.method?.toUpperCase() || (input instanceof Request ? input.method : 'GET')
    if (method !== 'GET') {
      return new Response(JSON.stringify({ success: true, data: null, message: 'Static mode' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const data = await loadStaticData()
      const { matched, response } = matchRoute(url, data)
      if (matched) {
        return new Response(JSON.stringify(response), {
          status: response?.error ? 404 : 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch (err) {
      console.warn('[StaticData] Error serving:', url, err)
    }

    return new Response(JSON.stringify({ success: true, data: null }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Call immediately when this module is imported
ensurePatch()

export function StaticDataProvider({ children }: { children: ReactNode }) {
  // Ensure patch is applied (idempotent)
  useEffect(() => {
    ensurePatch()
  }, [])

  return <>{children}</>
}
