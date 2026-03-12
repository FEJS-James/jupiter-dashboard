'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
  Bold, 
  Italic, 
  List, 
  Code, 
  Link, 
  AtSign, 
  Paperclip, 
  Send, 
  X,
  Eye,
  Edit
} from 'lucide-react'
import { Agent } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface CommentEditorProps {
  agents: Agent[]
  onSubmit: (data: {
    content: string
    contentType: 'plain' | 'markdown' | 'rich'
    mentions: number[]
    attachments?: string[]
    metadata?: Record<string, unknown>
  }) => Promise<void>
  onCancel?: () => void
  selectedAgent: number
  onAgentChange: (agentId: number) => void
  initialContent?: string
  initialContentType?: 'plain' | 'markdown' | 'rich'
  initialMentions?: number[]
  placeholder?: string
  autoFocus?: boolean
  isEditing?: boolean
  loading?: boolean
}

interface Mention {
  id: number
  name: string
  color: string
}

export function CommentEditor({
  agents,
  onSubmit,
  onCancel,
  selectedAgent,
  onAgentChange,
  initialContent = '',
  initialContentType = 'plain',
  initialMentions = [],
  placeholder = 'Add a comment...',
  autoFocus = false,
  isEditing = false,
  loading = false,
}: CommentEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [contentType, setContentType] = useState<'plain' | 'markdown' | 'rich'>(initialContentType)
  const [mentions, setMentions] = useState<Mention[]>(
    initialMentions.map(id => {
      const agent = agents.find(a => a.id === id)
      return agent ? { id: agent.id, name: agent.name, color: agent.color } : null
    }).filter(Boolean) as Mention[]
  )
  const [showPreview, setShowPreview] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])
  
  // Handle @ mentions
  const handleTextChange = (value: string) => {
    setContent(value)
    
    // Check for @ mentions
    const cursorPos = textareaRef.current?.selectionStart || 0
    setCursorPosition(cursorPos)
    
    // Find the last @ before cursor
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const queryAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      
      // Only show suggestions if @ is at start of word and query is reasonable length
      if (/^\w*$/.test(queryAfterAt) && queryAfterAt.length <= 20) {
        setMentionQuery(queryAfterAt.toLowerCase())
        setShowMentionSuggestions(true)
      } else {
        setShowMentionSuggestions(false)
      }
    } else {
      setShowMentionSuggestions(false)
    }
  }
  
  const insertMention = (agent: Agent) => {
    const textBeforeCursor = content.substring(0, cursorPosition)
    const textAfterCursor = content.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const beforeAt = content.substring(0, lastAtIndex)
      const newContent = `${beforeAt}@${agent.name} ${textAfterCursor}`
      setContent(newContent)
      
      // Add to mentions list if not already present
      if (!mentions.find(m => m.id === agent.id)) {
        setMentions(prev => [...prev, {
          id: agent.id,
          name: agent.name,
          color: agent.color
        }])
      }
    }
    
    setShowMentionSuggestions(false)
    setMentionQuery('')
    
    // Focus back to textarea
    setTimeout(() => textareaRef.current?.focus(), 100)
  }
  
  const removeMention = (mentionId: number) => {
    const mention = mentions.find(m => m.id === mentionId)
    if (mention) {
      // Remove @mention from content
      const regex = new RegExp(`@${mention.name}\\b`, 'g')
      setContent(prev => prev.replace(regex, ''))
      
      // Remove from mentions array
      setMentions(prev => prev.filter(m => m.id !== mentionId))
    }
  }
  
  const insertFormattingTags = (tag: string) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    let beforeText = ''
    let afterText = ''
    
    switch (tag) {
      case 'bold':
        beforeText = '**'
        afterText = '**'
        break
      case 'italic':
        beforeText = '_'
        afterText = '_'
        break
      case 'code':
        beforeText = '`'
        afterText = '`'
        break
      case 'list':
        beforeText = '- '
        break
    }
    
    const newContent = 
      content.substring(0, start) + 
      beforeText + selectedText + afterText + 
      content.substring(end)
    
    setContent(newContent)
    
    // Set cursor position after formatting
    setTimeout(() => {
      const newPos = start + beforeText.length + selectedText.length + afterText.length
      textarea.setSelectionRange(newPos, newPos)
      textarea.focus()
    }, 10)
  }
  
  const handleSubmit = async () => {
    if (!content.trim()) return
    
    const mentionIds = mentions.map(m => m.id)
    
    await onSubmit({
      content: content.trim(),
      contentType,
      mentions: mentionIds,
      metadata: {
        editorVersion: '1.0',
        charactersCount: content.length,
        wordsCount: content.trim().split(/\s+/).length,
      }
    })
    
    // Reset form if not editing
    if (!isEditing) {
      setContent('')
      setMentions([])
      setShowPreview(false)
    }
  }
  
  const renderPreview = () => {
    if (contentType === 'markdown') {
      // Simple markdown preview (in a real app, you'd use a proper markdown parser)
      let preview = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
      
      // Wrap list items in ul
      if (preview.includes('<li>')) {
        preview = preview.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      }
      
      return <div 
        className="text-sm text-slate-200 prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: preview }}
      />
    }
    
    // Plain text preview with mention highlighting
    return (
      <div className="text-sm text-slate-200 whitespace-pre-wrap">
        {content.split(/(@\w+)/).map((part, index) => {
          if (part.startsWith('@')) {
            const mentionName = part.substring(1)
            const mention = mentions.find(m => m.name === mentionName)
            if (mention) {
              return (
                <span 
                  key={index} 
                  className="bg-blue-500/20 text-blue-300 px-1 rounded"
                  style={{ borderLeft: `2px solid ${mention.color}` }}
                >
                  {part}
                </span>
              )
            }
          }
          return part
        })}
      </div>
    )
  }
  
  const filteredAgents = agents.filter(agent => 
    mentionQuery ? 
    agent.name.toLowerCase().includes(mentionQuery) ||
    agent.role.toLowerCase().includes(mentionQuery) :
    true
  ).slice(0, 5)
  
  return (
    <div className="space-y-3 bg-slate-800/30 border border-slate-600 rounded-lg p-4">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Comment as:</span>
          <Select value={selectedAgent.toString()} onValueChange={(value) => onAgentChange(Number(value))}>
            <SelectTrigger className="w-[200px] h-8 bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{agent.name} ({agent.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-slate-400 hover:text-slate-200"
          >
            {showPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          
          <Select value={contentType} onValueChange={(value: 'plain' | 'markdown' | 'rich') => setContentType(value)}>
            <SelectTrigger className="w-[120px] h-8 bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plain">Plain</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="rich">Rich Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Mentions Display */}
      <AnimatePresence>
        {mentions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            <span className="text-xs text-slate-400">Mentioning:</span>
            {mentions.map(mention => (
              <Badge 
                key={mention.id} 
                variant="secondary"
                className="bg-blue-500/20 text-blue-300 border border-blue-500/30 pl-2 pr-1"
              >
                <div 
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: mention.color }}
                />
                @{mention.name}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMention(mention.id)}
                  className="ml-1 h-4 w-4 p-0 hover:bg-red-500/20"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Editor Area */}
      <div className="relative">
        {showPreview ? (
          <div className="min-h-[100px] p-3 bg-slate-700/30 border border-slate-600 rounded">
            {renderPreview()}
          </div>
        ) : (
          <div className="relative">
            {/* Formatting Toolbar */}
            {contentType === 'markdown' && (
              <div className="flex items-center gap-1 mb-2 p-2 bg-slate-700/30 border border-slate-600 rounded-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormattingTags('bold')}
                  className="h-7 w-7 p-0"
                  title="Bold"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormattingTags('italic')}
                  className="h-7 w-7 p-0"
                  title="Italic"
                >
                  <Italic className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormattingTags('code')}
                  className="h-7 w-7 p-0"
                  title="Code"
                >
                  <Code className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormattingTags('list')}
                  className="h-7 w-7 p-0"
                  title="List"
                >
                  <List className="w-3 h-3" />
                </Button>
                <div className="border-l border-slate-600 h-4 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Mention (@)"
                >
                  <AtSign className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Attach File"
                >
                  <Paperclip className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={placeholder}
              className={`bg-slate-700 border-slate-600 text-slate-100 min-h-[100px] resize-none ${
                contentType === 'markdown' && 'rounded-t-none'
              }`}
            />
            
            {/* Mention Suggestions */}
            <AnimatePresence>
              {showMentionSuggestions && filteredAgents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                >
                  {filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => insertMention(agent)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left"
                    >
                      <Avatar className="w-6 h-6">
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{agent.name}</div>
                        <div className="text-xs text-slate-400">{agent.role}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {contentType === 'markdown' && 'Markdown formatting supported'}
          {contentType === 'plain' && 'Plain text with @mentions'}
          {contentType === 'rich' && 'Rich text formatting (coming soon)'}
        </div>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              'Posting...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isEditing ? 'Update' : 'Post'} Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}