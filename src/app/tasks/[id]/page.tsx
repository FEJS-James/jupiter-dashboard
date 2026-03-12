'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Flag, 
  MessageSquare, 
  History, 
  Paperclip,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  GitBranch,
  Target
} from 'lucide-react'
import { Task, TaskPriority, TaskStatus, Project, Agent } from '@/types'
import { TaskFormDialog } from '@/components/kanban/task-form-dialog'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Comment {
  id: number
  taskId: number
  content: string
  timestamp: string
  agent: {
    id: number
    name: string
    role: string
    color: string
  }
}

interface ActivityItem {
  id: number
  action: string
  details: Record<string, unknown>
  timestamp: string
  agent?: {
    id: number
    name: string
    role: string
    color: string
  }
}

const priorityConfig: Record<TaskPriority, { color: string; bgColor: string; icon: React.ReactNode }> = {
  low: { 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/20 border-slate-500/30',
    icon: <Flag className="w-3 h-3" />
  },
  medium: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    icon: <Flag className="w-3 h-3" />
  },
  high: { 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    icon: <Flag className="w-3 h-3" />
  },
  urgent: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20 border-red-500/30',
    icon: <Flag className="w-3 h-3 fill-current" />
  }
}

const statusConfig: Record<TaskStatus, { color: string; bgColor: string; icon: React.ReactNode }> = {
  'backlog': { 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/20 border-slate-500/30',
    icon: <Timer className="w-3 h-3" />
  },
  'in-progress': { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    icon: <Timer className="w-3 h-3" />
  },
  'code-review': { 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    icon: <GitBranch className="w-3 h-3" />
  },
  'testing': { 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20 border-yellow-500/30',
    icon: <Target className="w-3 h-3" />
  },
  'deploying': { 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    icon: <GitBranch className="w-3 h-3" />
  },
  'done': { 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20 border-green-500/30',
    icon: <CheckCircle className="w-3 h-3" />
  },
  'blocked': { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/20 border-red-500/30',
    icon: <XCircle className="w-3 h-3" />
  }
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // Comment form state
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<number>(1) // Default to first agent

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  
  // Related tasks state
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([])

  // Extract ID from params
  const [taskId, setTaskId] = useState<string | null>(null)

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setTaskId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails()
      fetchComments()
    }
  }, [taskId])

  // Fetch activity after agents are loaded (for fallback data)
  useEffect(() => {
    if (taskId && agents.length > 0) {
      fetchActivity()
    }
  }, [taskId, agents])

  const fetchTaskDetails = async () => {
    if (!taskId) return

    try {
      setError(null)
      const [taskRes, projectsRes, agentsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch('/api/projects'),
        fetch('/api/agents')
      ])

      if (taskRes.status === 404) {
        setError('Task not found')
        return
      }

      if (!taskRes.ok || !projectsRes.ok || !agentsRes.ok) {
        throw new Error('Failed to fetch task details')
      }

      const [taskData, projectsData, agentsData] = await Promise.all([
        taskRes.json(),
        projectsRes.json(),
        agentsRes.json()
      ])

      if (taskData.success && projectsData.success && agentsData.success) {
        setTask(taskData.data)
        setProjects(projectsData.data)
        setAgents(agentsData.data)
        
        // Fetch related tasks (dependencies)
        if (taskData.data.dependencies && taskData.data.dependencies.length > 0) {
          await fetchRelatedTasks(taskData.data.dependencies)
        }
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Failed to fetch task details:', error)
      setError('Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedTasks = async (dependencies: number[]) => {
    try {
      const taskPromises = dependencies.map(id => fetch(`/api/tasks/${id}`))
      const responses = await Promise.all(taskPromises)
      const tasks = await Promise.all(
        responses.map(async (res) => {
          if (res.ok) {
            const data = await res.json()
            return data.success ? data.data : null
          }
          return null
        })
      )
      setRelatedTasks(tasks.filter(Boolean))
    } catch (error) {
      console.error('Failed to fetch related tasks:', error)
    }
  }

  const fetchComments = async () => {
    if (!taskId) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setComments(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const fetchActivity = async () => {
    if (!taskId) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/activity`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setActivity(data.data)
        }
      } else {
        // Fallback to simulated data if endpoint returns error
        const simulatedActivity: ActivityItem[] = [
          {
            id: 1,
            action: 'created',
            details: { status: 'backlog' },
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            agent: agents.find(a => a.role === 'manager') || undefined
          },
          {
            id: 2,
            action: 'moved',
            details: { from: 'backlog', to: 'in-progress' },
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            agent: agents.find(a => a.role === 'coder') || undefined
          }
        ]
        setActivity(simulatedActivity)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
      // Use simulated data as fallback
      const simulatedActivity: ActivityItem[] = [
        {
          id: 1,
          action: 'created',
          details: { status: 'backlog' },
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          agent: agents.find(a => a.role === 'manager') || undefined
        }
      ]
      setActivity(simulatedActivity)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId) return

    setCommentLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          agentId: selectedAgent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const result = await response.json()
      if (result.success) {
        setComments(prev => [...prev, result.data])
        setNewComment('')
        toast.success('Comment added successfully')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleEditTask = async (taskData: Partial<Task>) => {
    if (!task) return

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      if (result.success) {
        setTask(prev => prev ? { ...prev, ...result.data } : null)
        toast.success('Task updated successfully')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('Failed to update task')
      throw error
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert className="bg-red-900/20 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            {error || 'Task not found'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with breadcrumbs */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-sm text-slate-400">
          <Link href="/tasks" className="hover:text-slate-200">Tasks</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-200">{task.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details Card */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <h1 className="text-2xl font-bold text-slate-100 flex-1">
                    {task.title}
                  </h1>
                  <Button
                    onClick={() => setShowEditDialog(true)}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge 
                    className={`${statusConfig[task.status].bgColor} ${statusConfig[task.status].color} border`}
                  >
                    {statusConfig[task.status].icon}
                    <span className="ml-1 capitalize">{task.status.replace('-', ' ')}</span>
                  </Badge>
                  
                  <Badge 
                    className={`${priorityConfig[task.priority].bgColor} ${priorityConfig[task.priority].color} border`}
                  >
                    {priorityConfig[task.priority].icon}
                    <span className="ml-1 capitalize">{task.priority}</span>
                  </Badge>
                  
                  {task.tags && task.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-slate-700 text-slate-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {task.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Description</h3>
                  <p className="text-slate-100 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Task Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  {task.project && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Project:</span>
                      <span className="text-slate-200">{task.project.name}</span>
                    </div>
                  )}
                  
                  {task.assignedAgent && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Assignee:</span>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: task.agent?.color || '#3b82f6' }}
                        />
                        <span className="text-slate-200">{task.assignedAgent}</span>
                      </div>
                    </div>
                  )}
                  
                  {task.effort && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Effort:</span>
                      <span className="text-slate-200">{task.effort} points</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">{formatDate(task.createdAt)}</span>
                  </div>
                  
                  {task.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-400">Due:</span>
                      <span className="text-slate-200">{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-400">Updated:</span>
                    <span className="text-slate-200">{formatDate(task.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </h3>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    File attachments will be implemented in a future update
                  </p>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="text-sm text-slate-300">
                          {file}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment Form */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-100 min-h-[80px]"
                />
                <div className="flex items-center justify-between">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600 text-slate-100 text-sm rounded px-2 py-1"
                  >
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentLoading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {commentLoading ? (
                      'Posting...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No comments yet</p>
                ) : (
                  comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 p-4 bg-slate-700/30 rounded-lg"
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: comment.agent.color }}
                        >
                          {comment.agent.name.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-200">
                            {comment.agent.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {comment.agent.role}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {formatRelativeTime(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-100 text-sm whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task History */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="text-slate-400 text-sm">No activity yet</p>
                ) : (
                  activity.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-200">
                          <span className="font-medium">
                            {item.agent?.name || 'System'}
                          </span>{' '}
                          {item.action === 'created' && 'created this task'}
                          {item.action === 'moved' && `moved task from ${item.details.from} to ${item.details.to}`}
                          {item.action === 'assigned' && `assigned task to ${item.details.assignee}`}
                          {item.action === 'commented' && 'added a comment'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Tasks */}
          {relatedTasks.length > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Dependencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedTasks.map(relatedTask => (
                    <Link
                      key={relatedTask.id}
                      href={`/tasks/${relatedTask.id}`}
                      className="block p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Badge 
                          size="sm"
                          className={`${statusConfig[relatedTask.status].bgColor} ${statusConfig[relatedTask.status].color} border`}
                        >
                          {statusConfig[relatedTask.status].icon}
                        </Badge>
                        <span className="text-sm text-slate-200 flex-1">
                          {relatedTask.title}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Actions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setShowEditDialog(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Task
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast.success('Task URL copied to clipboard')
                }}
              >
                Share Task
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <TaskFormDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSubmit={handleEditTask}
        task={task}
        projects={projects}
        agents={agents}
      />
    </div>
  )
}