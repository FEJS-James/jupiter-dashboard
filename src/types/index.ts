// Common types used throughout the application

export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Project Management Types

export type TaskStatus = 'backlog' | 'in-progress' | 'code-review' | 'testing' | 'deploying' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type AgentRole = 'coder' | 'reviewer' | 'devops' | 'manager' | 'tester'
export type AgentStatus = 'available' | 'busy' | 'offline'

export interface Project {
  id: number
  name: string
  description?: string
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  techStack?: string[]
  repoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: number
  name: string
  role: AgentRole
  color: string
  avatarUrl?: string
  status: AgentStatus
  currentTaskId?: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: number
  projectId: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignedAgent?: string
  tags?: string[]
  dueDate?: string
  effort?: number
  dependencies?: number[]
  createdAt: string
  updatedAt: string
  project?: Project
  agent?: Agent
}

export interface TaskWithRelations extends Task {
  project: Project
  agent?: Agent
}

export interface TaskComment {
  id: number
  taskId: number
  parentId?: number
  content: string
  contentType: 'plain' | 'markdown' | 'rich'
  isEdited: boolean
  isDeleted: boolean
  deletedAt?: string
  mentions?: number[]
  attachments?: string[]
  metadata?: Record<string, unknown>
  timestamp: string
  updatedAt: string
  agent: {
    id: number
    name: string
    role: string
    color: string
  }
  deletedByAgent?: {
    id: number
    name: string
    role: string
    color: string
  }
  replies?: TaskComment[]
  reactions?: CommentReaction[]
  editHistory?: CommentEditHistory[]
  replyCount?: number
}

export interface CommentEditHistory {
  id: number
  commentId: number
  previousContent: string
  editReason?: string
  editedAt: string
  editedByAgent: {
    id: number
    name: string
    role: string
    color: string
  }
}

export interface CommentReaction {
  id: number
  commentId: number
  reaction: string
  timestamp: string
  agent: {
    id: number
    name: string
    role: string
    color: string
  }
}

export interface CommentNotification {
  id: number
  recipientAgentId: number
  commentId: number
  taskId: number
  type: 'mention' | 'reply' | 'assigned'
  isRead: boolean
  readAt?: string
  createdAt: string
  comment?: TaskComment
  task?: Task
}

export interface TaskActivity {
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

export interface TaskAttachment {
  id: number
  taskId: number
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  uploadedBy: number
  uploadedAt: string
}