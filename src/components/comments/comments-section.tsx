'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MessageSquare, 
  RefreshCw, 
  Filter, 
  SortDesc, 
  Users,
  AlertCircle 
} from 'lucide-react'
import { TaskComment, Agent } from '@/types'
import { CommentEditor } from './comment-editor'
import { CommentItem } from './comment-item'
import { useWebSocket } from '@/contexts/websocket-context'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface CommentsSectionProps {
  taskId: number
  agents: Agent[]
  currentAgent?: Agent
  initialComments?: TaskComment[]
}

export function CommentsSection({
  taskId,
  agents,
  currentAgent,
  initialComments = [],
}: CommentsSectionProps) {
  const [comments, setComments] = useState<TaskComment[]>(initialComments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState(currentAgent?.id || agents[0]?.id || 1)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [showDeleted, setShowDeleted] = useState(false)
  
  const { connectionStatus } = useWebSocket()
  
  // Fetch comments from API
  const fetchComments = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        includeDeleted: showDeleted.toString(),
        limit: '100',
        offset: '0',
      })
      
      const response = await fetch(`/api/tasks/${taskId}/comments?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setComments(data.data)
        
        // Also fetch replies for each top-level comment
        await Promise.all(
          data.data.map(async (comment: TaskComment) => {
            if (comment.replyCount && comment.replyCount > 0) {
              try {
                const repliesResponse = await fetch(
                  `/api/tasks/${taskId}/comments?parentId=${comment.id}&limit=50`
                )
                if (repliesResponse.ok) {
                  const repliesData = await repliesResponse.json()
                  if (repliesData.success) {
                    setComments(prev => prev.map(c => 
                      c.id === comment.id 
                        ? { ...c, replies: repliesData.data }
                        : c
                    ))
                  }
                }
              } catch (error) {
                console.error('Failed to fetch replies for comment', comment.id, error)
              }
            }
          })
        )
      } else {
        throw new Error(data.message || 'Failed to fetch comments')
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch comments')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [taskId, showDeleted])
  
  // Initial load
  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments()
    }
  }, [fetchComments, initialComments.length])
  
  // Real-time comment updates via polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComments(false)
    }, 15000)

    return () => clearInterval(interval)
  }, [fetchComments])
  
  // Handle comment operations
  const handleAddComment = async (data: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          agentId: selectedAgent,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to add comment')
      }
      
      // Comment will be added via WebSocket event
    } catch (error) {
      console.error('Failed to add comment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
      throw error
    }
  }
  
  const handleEditComment = async (commentId: number, data: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to update comment')
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
      throw error
    }
  }
  
  const handleDeleteComment = async (commentId: number, reason?: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason,
          deleterAgentId: currentAgent?.id 
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete comment')
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      throw error
    }
  }
  
  const handleReplyToComment = async (parentCommentId: number, data: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          agentId: selectedAgent,
          parentId: parentCommentId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to post reply')
      }
    } catch (error) {
      console.error('Failed to post reply:', error)
      throw error
    }
  }
  
  const handleReactToComment = async (commentId: number, reaction: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reaction,
          agentId: currentAgent?.id,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to add reaction')
      }
    } catch (error) {
      console.error('Failed to react to comment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add reaction')
    }
  }
  
  const handleRemoveReaction = async (commentId: number, reaction: string) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}/reactions?reaction=${reaction}&agentId=${currentAgent?.id}`,
        { method: 'DELETE' }
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to remove reaction')
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to remove reaction')
    }
  }
  
  // Sort comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    } else {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    }
  })
  
  // Filter comments
  const filteredComments = sortedComments.filter(comment => 
    showDeleted || !comment.isDeleted
  )
  
  const totalComments = comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0)
  }, 0)
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({totalComments})
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {connectionStatus !== 'connected' && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <AlertCircle className="w-3 h-3" />
              {connectionStatus}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchComments()}
            disabled={loading}
            className="text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
            className="text-slate-400 hover:text-slate-200"
          >
            <SortDesc className="w-4 h-4 mr-1" />
            {sortBy === 'newest' ? 'Newest' : 'Oldest'}
          </Button>
          
          {comments.some(c => c.isDeleted) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
              className={`text-slate-400 hover:text-slate-200 ${showDeleted ? 'bg-slate-700' : ''}`}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showDeleted ? 'Hide deleted' : 'Show deleted'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <CommentEditor
          agents={agents}
          onSubmit={handleAddComment}
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
          placeholder="Add a comment..."
        />
        
        {/* Error State */}
        {error && (
          <Alert className="bg-red-900/20 border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchComments()}
                className="ml-2 h-6 text-red-200 hover:text-red-100"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Loading State */}
        {loading && comments.length === 0 && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Comments List */}
        <div className="space-y-1">
          {filteredComments.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  agents={agents}
                  currentAgent={currentAgent}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onReply={handleReplyToComment}
                  onReact={handleReactToComment}
                  onRemoveReaction={handleRemoveReaction}
                  showReplies={true}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Real-time Connection Status */}
        {connectionStatus !== 'connected' && (
          <div className="flex items-center justify-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-sm">
            <Users className="w-4 h-4" />
            Real-time updates {connectionStatus}
          </div>
        )}
      </CardContent>
    </Card>
  )
}