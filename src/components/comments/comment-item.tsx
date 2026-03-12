'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  MoreVertical, 
  Reply, 
  Edit, 
  Trash2, 
  Flag, 
  History, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle, 
  CheckCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { TaskComment, CommentEditHistory, CommentReaction, Agent } from '@/types'
import { CommentEditor } from './comment-editor'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface CommentItemProps {
  comment: TaskComment
  agents: Agent[]
  currentAgent?: Agent
  onEdit?: (commentId: number, data: any) => Promise<void>
  onDelete?: (commentId: number, reason?: string) => Promise<void>
  onReply?: (parentCommentId: number, data: any) => Promise<void>
  onReact?: (commentId: number, reaction: string) => Promise<void>
  onRemoveReaction?: (commentId: number, reaction: string) => Promise<void>
  onReport?: (commentId: number, reason: string) => Promise<void>
  showReplies?: boolean
  nestingLevel?: number
  maxNestingLevel?: number
}

const reactionConfig = {
  like: { icon: ThumbsUp, label: 'Like', color: 'text-blue-400' },
  dislike: { icon: ThumbsDown, label: 'Dislike', color: 'text-red-400' },
  helpful: { icon: HelpCircle, label: 'Helpful', color: 'text-green-400' },
  resolved: { icon: CheckCircle, label: 'Resolved', color: 'text-purple-400' },
}

export function CommentItem({
  comment,
  agents,
  currentAgent,
  onEdit,
  onDelete,
  onReply,
  onReact,
  onRemoveReaction,
  onReport,
  showReplies = true,
  nestingLevel = 0,
  maxNestingLevel = 3,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [showRepliesExpanded, setShowRepliesExpanded] = useState(false)
  const [showEditHistory, setShowEditHistory] = useState(false)
  const [editingComment, setEditingComment] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  
  const isDeleted = comment.isDeleted
  const canEdit = currentAgent && currentAgent.id === comment.agent.id && !isDeleted
  const canDelete = currentAgent && (
    currentAgent.id === comment.agent.id || 
    ['manager', 'reviewer'].includes(currentAgent.role)
  ) && !isDeleted
  const canReply = !isDeleted && nestingLevel < maxNestingLevel
  
  useEffect(() => {
    if (isEditing) {
      setEditingComment({
        content: comment.content,
        contentType: comment.contentType,
        mentions: comment.mentions || [],
      })
    }
  }, [isEditing, comment])
  
  const handleEdit = async (data: any) => {
    if (!onEdit) return
    
    setLoadingAction('edit')
    try {
      await onEdit(comment.id, {
        ...data,
        editorAgentId: currentAgent?.id,
      })
      setIsEditing(false)
      toast.success('Comment updated successfully')
    } catch (error) {
      toast.error('Failed to update comment')
    } finally {
      setLoadingAction(null)
    }
  }
  
  const handleDelete = async () => {
    if (!onDelete || !currentAgent) return
    
    setLoadingAction('delete')
    try {
      await onDelete(comment.id)
      toast.success('Comment deleted successfully')
    } catch (error) {
      toast.error('Failed to delete comment')
    } finally {
      setLoadingAction(null)
    }
  }
  
  const handleReply = async (data: any) => {
    if (!onReply) return
    
    setLoadingAction('reply')
    try {
      await onReply(comment.id, data)
      setIsReplying(false)
      toast.success('Reply posted successfully')
    } catch (error) {
      toast.error('Failed to post reply')
    } finally {
      setLoadingAction(null)
    }
  }
  
  const handleReact = async (reaction: string) => {
    if (!onReact || !currentAgent) return
    
    // Check if user already reacted with this reaction
    const existingReaction = comment.reactions?.find(r => 
      r.agent.id === currentAgent.id && r.reaction === reaction
    )
    
    if (existingReaction) {
      if (onRemoveReaction) {
        await onRemoveReaction(comment.id, reaction)
      }
    } else {
      await onReact(comment.id, reaction)
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }
  
  const renderContent = () => {
    if (isDeleted) {
      return (
        <div className="text-slate-500 italic text-sm">
          [This comment has been deleted]
        </div>
      )
    }
    
    if (comment.contentType === 'markdown') {
      // Simple markdown rendering (in a real app, use a proper markdown library)
      let content = comment.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded text-sm">$1</code>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
      
      // Handle mentions
      if (comment.mentions && comment.mentions.length > 0) {
        comment.mentions.forEach(mentionId => {
          const agent = agents.find(a => a.id === mentionId)
          if (agent) {
            const regex = new RegExp(`@${agent.name}\\b`, 'g')
            content = content.replace(
              regex, 
              `<span class="bg-blue-500/20 text-blue-300 px-1 rounded border-l-2" style="border-left-color: ${agent.color}">@${agent.name}</span>`
            )
          }
        })
      }
      
      // Wrap list items in ul
      if (content.includes('<li>')) {
        content = content.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="list-disc ml-4 my-2">$1</ul>')
      }
      
      return (
        <div 
          className="text-slate-200 prose prose-invert prose-sm max-w-none whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }
    
    // Plain text with mention highlighting
    const renderPlainTextWithMentions = () => {
      if (!comment.mentions || comment.mentions.length === 0) {
        return comment.content
      }
      
      let parts: React.ReactNode[] = [comment.content]
      
      comment.mentions.forEach(mentionId => {
        const agent = agents.find(a => a.id === mentionId)
        if (agent) {
          const mentionText = `@${agent.name}`
          parts = parts.flatMap((part, partIndex) => {
            if (typeof part === 'string') {
              const stringParts = part.split(mentionText)
              const result: React.ReactNode[] = []
              
              stringParts.forEach((stringPart, index) => {
                result.push(stringPart)
                if (index < stringParts.length - 1) {
                  result.push(
                    <span 
                      key={`mention-${mentionId}-${partIndex}-${index}`}
                      className="bg-blue-500/20 text-blue-300 px-1 rounded border-l-2"
                      style={{ borderLeftColor: agent.color }}
                    >
                      {mentionText}
                    </span>
                  )
                }
              })
              
              return result
            }
            return [part]
          })
        }
      })
      
      return parts
    }
    
    return (
      <div className="text-slate-200 whitespace-pre-wrap text-sm">
        {renderPlainTextWithMentions()}
      </div>
    )
  }
  
  const renderReactions = () => {
    if (!comment.reactions || comment.reactions.length === 0) return null
    
    // Group reactions by type
    const reactionCounts: Record<string, { count: number; agents: CommentReaction['agent'][], userReacted: boolean }> = {}
    
    comment.reactions.forEach(reaction => {
      if (!reactionCounts[reaction.reaction]) {
        reactionCounts[reaction.reaction] = { 
          count: 0, 
          agents: [],
          userReacted: false
        }
      }
      reactionCounts[reaction.reaction].count++
      reactionCounts[reaction.reaction].agents.push(reaction.agent)
      if (currentAgent && reaction.agent.id === currentAgent.id) {
        reactionCounts[reaction.reaction].userReacted = true
      }
    })
    
    return (
      <div className="flex items-center gap-1 mt-2">
        {Object.entries(reactionCounts).map(([reactionType, data]) => {
          const config = reactionConfig[reactionType as keyof typeof reactionConfig]
          if (!config) return null
          
          const Icon = config.icon
          
          return (
            <Button
              key={reactionType}
              variant="ghost"
              size="sm"
              onClick={() => handleReact(reactionType)}
              className={`h-6 px-2 text-xs ${
                data.userReacted 
                  ? `${config.color} bg-slate-700/50 border border-slate-600` 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`${config.label} (${data.agents.map(a => a.name).join(', ')})`}
            >
              <Icon className="w-3 h-3 mr-1" />
              {data.count}
            </Button>
          )
        })}
      </div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${nestingLevel > 0 ? 'ml-8 mt-3' : 'mt-4'}`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div 
          className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-medium"
          style={{ backgroundColor: comment.agent.color }}
        >
          {comment.agent.name.charAt(0).toUpperCase()}
        </div>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="bg-slate-700/30 rounded-lg p-3">
          {/* Comment Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-200">
                {comment.agent.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {comment.agent.role}
              </Badge>
              <span className="text-xs text-slate-400">
                {formatDate(comment.timestamp)}
              </span>
              {comment.isEdited && (
                <button
                  onClick={() => setShowEditHistory(true)}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <History className="w-3 h-3" />
                  edited
                </button>
              )}
              {nestingLevel > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Reply
                </Badge>
              )}
            </div>
            
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onReport && onReport(comment.id, 'inappropriate')}>
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Comment Content */}
          {isEditing ? (
            <CommentEditor
              agents={agents}
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
              selectedAgent={currentAgent?.id || comment.agent.id}
              onAgentChange={() => {}} // Can't change agent when editing
              initialContent={editingComment?.content}
              initialContentType={editingComment?.contentType}
              initialMentions={editingComment?.mentions}
              placeholder="Edit your comment..."
              autoFocus
              isEditing
              loading={loadingAction === 'edit'}
            />
          ) : (
            <>
              {renderContent()}
              {renderReactions()}
            </>
          )}
        </div>
        
        {/* Comment Actions */}
        {!isEditing && !isDeleted && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="h-6 px-2 text-slate-400 hover:text-slate-200"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
            
            {/* Quick Reactions */}
            {Object.entries(reactionConfig).map(([reactionType, config]) => {
              const Icon = config.icon
              const userReacted = comment.reactions?.some(r => 
                r.agent.id === currentAgent?.id && r.reaction === reactionType
              )
              
              return (
                <Button
                  key={reactionType}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReact(reactionType)}
                  className={`h-6 px-2 ${
                    userReacted ? config.color : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={config.label}
                >
                  <Icon className="w-3 h-3" />
                </Button>
              )
            })}
            
            {comment.replyCount && comment.replyCount > 0 && showReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRepliesExpanded(!showRepliesExpanded)}
                className="h-6 px-2 text-slate-400 hover:text-slate-200"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                {showRepliesExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            )}
          </div>
        )}
        
        {/* Reply Form */}
        <AnimatePresence>
          {isReplying && canReply && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <CommentEditor
                agents={agents}
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                selectedAgent={currentAgent?.id || agents[0]?.id || 1}
                onAgentChange={() => {}}
                placeholder={`Reply to ${comment.agent.name}...`}
                autoFocus
                loading={loadingAction === 'reply'}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Nested Replies */}
        <AnimatePresence>
          {showRepliesExpanded && comment.replies && comment.replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  agents={agents}
                  currentAgent={currentAgent}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  onReact={onReact}
                  onRemoveReaction={onRemoveReaction}
                  onReport={onReport}
                  showReplies={true}
                  nestingLevel={nestingLevel + 1}
                  maxNestingLevel={maxNestingLevel}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Edit History Dialog */}
        <Dialog open={showEditHistory} onOpenChange={setShowEditHistory}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Edit History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comment.editHistory?.map(edit => (
                <div key={edit.id} className="border-l-2 border-slate-600 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-300">
                      Edited by {edit.editedByAgent.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(edit.editedAt)}
                    </span>
                  </div>
                  {edit.editReason && (
                    <div className="text-xs text-slate-400 mb-2">
                      Reason: {edit.editReason}
                    </div>
                  )}
                  <div className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">
                    {edit.previousContent}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}