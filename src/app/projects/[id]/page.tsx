'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Task, Project } from '@/types'
import { Board } from '@/components/kanban/board'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface ApiError {
  error: string
  details?: {
    issues: Array<{
      field: string
      message: string
    }>
  }
}

export default function ProjectBoardPage() {
  const params = useParams()
  const projectId = params.id as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjectData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch project details and tasks in parallel
      const [projectResponse, tasksResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/tasks?project=${projectId}`)
      ])

      if (!projectResponse.ok) {
        const errorData: ApiError = await projectResponse.json()
        throw new Error(errorData.error || 'Failed to fetch project')
      }

      if (!tasksResponse.ok) {
        const errorData: ApiError = await tasksResponse.json()
        throw new Error(errorData.error || 'Failed to fetch tasks')
      }

      const projectData: ApiResponse<Project> = await projectResponse.json()
      const tasksData: ApiResponse<Task[]> = await tasksResponse.json()

      setProject(projectData.data)
      setTasks(tasksData.data)
    } catch (err) {
      console.error('Error fetching project data:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId, fetchProjectData])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2 bg-slate-800" />
            <Skeleton className="h-4 w-96 bg-slate-800" />
          </div>

          {/* Board skeleton */}
          <div className="flex gap-6 overflow-x-auto pb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 min-w-[300px] max-w-sm">
                <Skeleton className="h-10 mb-4 bg-slate-800" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-32 bg-slate-800" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-100 mb-2">
                Failed to Load Project
              </h2>
              <p className="text-slate-400 mb-4 max-w-md">
                {error}
              </p>
              <Button 
                onClick={fetchProjectData}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Project Header */}
        {project && (
          <div className="mb-6 p-6 bg-slate-900/50 rounded-lg border border-slate-800 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-100 mb-2">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-slate-400 mb-3">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    project.status === 'planning' ? 'bg-blue-500/20 text-blue-400' :
                    project.status === 'on-hold' ? 'bg-yellow-500/20 text-yellow-400' :
                    project.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {project.status}
                  </span>
                  {project.techStack && project.techStack.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Stack:</span>
                      {project.techStack.slice(0, 3).map((tech) => (
                        <span 
                          key={tech}
                          className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 3 && (
                        <span className="text-slate-400 text-xs">
                          +{project.techStack.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button 
                onClick={fetchProjectData}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <Board tasks={tasks} />
      </div>
    </div>
  )
}