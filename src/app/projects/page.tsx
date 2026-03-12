'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Plus, Search, FolderOpen, Calendar, GitBranch } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

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

interface ProjectWithStats extends Project {
  stats?: Record<string, number>
  totalTasks?: number
}

const statusColors = {
  'planning': 'bg-blue-500/20 text-blue-400',
  'active': 'bg-green-500/20 text-green-400',
  'on-hold': 'bg-yellow-500/20 text-yellow-400',
  'completed': 'bg-emerald-500/20 text-emerald-400',
  'cancelled': 'bg-red-500/20 text-red-400',
}

const statusLabels = {
  'planning': 'Planning',
  'active': 'Active',
  'on-hold': 'On Hold',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
}

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/projects')
      
      if (!response.ok) {
        const errorData: ApiError = await response.json()
        throw new Error(errorData.error || 'Failed to fetch projects')
      }

      const data: ApiResponse<ProjectWithStats[]> = await response.json()
      setProjects(data.data)
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!confirm(`Are you sure you want to archive the project "${projectName}"? This will set its status to cancelled but preserve all data.`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData: ApiError = await response.json()
        throw new Error(errorData.error || 'Failed to archive project')
      }

      // Refresh the projects list
      fetchProjects()
    } catch (err) {
      console.error('Error archiving project:', err)
      alert('Failed to archive project: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2 bg-slate-800" />
            <Skeleton className="h-4 w-96 bg-slate-800 mb-6" />
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 w-32 bg-slate-800" />
              <Skeleton className="h-10 flex-1 max-w-md bg-slate-800" />
              <Skeleton className="h-10 w-40 bg-slate-800" />
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 bg-slate-800" />
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
                Failed to Load Projects
              </h2>
              <p className="text-slate-400 mb-4 max-w-md">
                {error}
              </p>
              <Button 
                onClick={fetchProjects}
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
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2">
                Projects
              </h1>
              <p className="text-slate-400">
                Manage all your development projects in one place.
              </p>
            </div>
            <Link href="/projects/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={fetchProjects}
              variant="outline"
              size="sm"
              className="border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Get started by creating your first project to organize your development work.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link href="/projects/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-slate-100 mb-2 line-clamp-1">
                          {project.name}
                        </CardTitle>
                        <Badge className={`text-xs ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {project.description && (
                      <p className="text-slate-400 text-sm mb-4 line-clamp-3 flex-1">
                        {project.description}
                      </p>
                    )}

                    {project.techStack && project.techStack.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Tech Stack:</p>
                        <div className="flex flex-wrap gap-1">
                          {project.techStack.slice(0, 3).map((tech) => (
                            <Badge 
                              key={tech}
                              variant="secondary" 
                              className="text-xs bg-slate-700/50"
                            >
                              {tech}
                            </Badge>
                          ))}
                          {project.techStack.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-slate-700/50">
                              +{project.techStack.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {project.totalTasks !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <GitBranch className="w-4 h-4" />
                          <span>{project.totalTasks} tasks</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-2 border-t border-slate-700/50">
                      <Link href={`/projects/${project.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-slate-700 hover:bg-slate-800">
                          View Board
                        </Button>
                      </Link>
                      <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="border-red-800 hover:bg-red-900/20 hover:border-red-700 text-red-400"
                      >
                        Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}