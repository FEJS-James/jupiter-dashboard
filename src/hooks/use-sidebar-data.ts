'use client'

import { useState, useEffect, useCallback } from 'react'

interface SidebarProject {
  id: number
  name: string
  status: string
}

interface SidebarAgent {
  id: number
  name: string
  status: string
  taskCount: number
}

interface SidebarData {
  projects: SidebarProject[]
  agents: SidebarAgent[]
  loading: boolean
}

export function useSidebarData(): SidebarData {
  const [projects, setProjects] = useState<SidebarProject[]>([])
  const [agents, setAgents] = useState<SidebarAgent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, agentsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/agents'),
      ])

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        const projectsList = Array.isArray(projectsData.data) ? projectsData.data : []
        setProjects(
          projectsList.map((p: any) => ({
            id: p.id,
            name: p.name,
            status: p.status,
          }))
        )
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        const agentsList = Array.isArray(agentsData.data) ? agentsData.data : []
        setAgents(
          agentsList.map((a: any) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            taskCount: a.taskCounts?.active ?? 0,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Refresh every 30 seconds for live agent status
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { projects, agents, loading }
}
