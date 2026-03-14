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

export type TaskStatus = 'backlog' | 'in-progress' | 'code-review' | 'testing' | 'deploying' | 'done' | 'blocked' | 'archived'
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

// Notification Types

export type NotificationType = 
  | 'task_assigned' 
  | 'task_reassigned' 
  | 'task_status_changed' 
  | 'task_priority_changed'
  | 'comment_added' 
  | 'comment_mention' 
  | 'comment_reply' 
  | 'project_task_added'
  | 'project_updated' 
  | 'system_announcement'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationEntityType = 'task' | 'project' | 'comment' | 'system'

export interface Notification {
  id: number
  recipientId: number
  type: NotificationType
  title: string
  message: string
  entityType?: NotificationEntityType
  entityId?: number
  relatedEntityType?: 'task' | 'project' | 'comment' | 'agent'
  relatedEntityId?: number
  actionUrl?: string
  metadata?: Record<string, unknown>
  isRead: boolean
  readAt?: string
  priority: NotificationPriority
  expiresAt?: string
  createdAt: string
  // Relations
  recipient?: Agent
  task?: Task
  project?: Project
  comment?: TaskComment
}

export interface NotificationWithRelations extends Notification {
  recipient: Agent
  task?: TaskWithRelations
  project?: Project
  comment?: TaskComment
}

export interface NotificationPreference {
  id: number
  agentId: number
  notificationType: NotificationType
  enabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  createdAt: string
  updatedAt: string
  agent?: Agent
}

export interface NotificationStats {
  unreadCount: number
  totalCount: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
}

export interface NotificationGroup {
  date: string
  notifications: NotificationWithRelations[]
  unreadCount: number
}

// User Preferences Types

export type LandingPage = 'dashboard' | 'kanban' | 'projects' | 'analytics'
export type TaskView = 'list' | 'kanban' | 'calendar'
export type FontSize = 'small' | 'medium' | 'large'
export type InterfaceDensity = 'compact' | 'comfortable' | 'spacious'
export type DateRange = 'week' | 'month' | 'quarter' | 'year'
export type NotificationFrequency = 'immediate' | 'batched' | 'digest'
export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf'

export interface UserPreferences {
  id: number
  agentId: number
  version: number
  
  // Dashboard & View Preferences
  defaultLandingPage: LandingPage
  defaultTaskView: TaskView
  tasksPerPage: number
  sidebarCollapsed: boolean
  kanbanColumnsVisible: string[]
  kanbanColumnOrder: string[]
  defaultDateRange: DateRange
  
  // Display & Theme Preferences
  fontSize: FontSize
  interfaceDensity: InterfaceDensity
  accentColor: string
  customThemeVariant?: string
  reducedMotion: boolean
  locale: string
  
  // Accessibility Preferences
  screenReaderOptimized: boolean
  highContrastMode: boolean
  keyboardNavigationEnabled: boolean
  focusIndicatorEnhanced: boolean
  textScaling: number
  audioFeedbackEnabled: boolean
  
  // Productivity Preferences
  defaultTaskPriority: TaskPriority
  defaultProjectId?: number
  autoSaveEnabled: boolean
  quickActionButtons: string[]
  defaultExportFormat: ExportFormat
  
  // Notification Preferences
  notificationFrequency: NotificationFrequency
  quietHoursStart?: string
  quietHoursEnd?: string
  quietHoursEnabled: boolean
  
  // Advanced Preferences (JSON storage)
  keyboardShortcuts: Record<string, string>
  analyticsPreferences: Record<string, unknown>
  exportPreferences: Record<string, unknown>
  customSettings: Record<string, unknown>
  
  createdAt: string
  updatedAt: string
  
  // Relations
  agent?: Agent
  defaultProject?: Project
  history?: PreferenceHistory[]
}

export interface UserPreferencesWithRelations extends UserPreferences {
  agent: Agent
  defaultProject?: Project
  history: PreferenceHistory[]
}

export interface PreferenceCategory {
  id: number
  name: string
  displayName: string
  description?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface PreferenceHistory {
  id: number
  userPreferenceId: number
  fieldName: string
  previousValue?: string
  newValue?: string
  changedAt: string
}

// Preference Form Types
export interface PreferenceFormData {
  // Dashboard & View
  defaultLandingPage: LandingPage
  defaultTaskView: TaskView
  tasksPerPage: number
  sidebarCollapsed: boolean
  kanbanColumnsVisible: string[]
  kanbanColumnOrder: string[]
  defaultDateRange: DateRange
  
  // Display & Theme
  fontSize: FontSize
  interfaceDensity: InterfaceDensity
  accentColor: string
  customThemeVariant?: string
  reducedMotion: boolean
  locale: string
  
  // Accessibility
  screenReaderOptimized: boolean
  highContrastMode: boolean
  keyboardNavigationEnabled: boolean
  focusIndicatorEnhanced: boolean
  textScaling: number
  audioFeedbackEnabled: boolean
  
  // Productivity
  defaultTaskPriority: TaskPriority
  defaultProjectId?: number
  autoSaveEnabled: boolean
  quickActionButtons: string[]
  defaultExportFormat: ExportFormat
  
  // Notifications
  notificationFrequency: NotificationFrequency
  quietHoursStart?: string
  quietHoursEnd?: string
  quietHoursEnabled: boolean
  
  // Advanced
  keyboardShortcuts: Record<string, string>
  analyticsPreferences: Record<string, unknown>
  exportPreferences: Record<string, unknown>
  customSettings: Record<string, unknown>
}

// Preference Update Types
export interface PreferenceUpdateRequest {
  category?: string
  field: string
  value: unknown
  batch?: boolean
}

export interface PreferenceBatchUpdateRequest {
  updates: Array<{
    field: string
    value: unknown
  }>
}

// Default Preferences
export const DEFAULT_USER_PREFERENCES: Partial<UserPreferencesWithRelations> = {
  defaultLandingPage: 'dashboard',
  defaultTaskView: 'kanban',
  tasksPerPage: 20,
  sidebarCollapsed: false,
  kanbanColumnsVisible: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done'],
  kanbanColumnOrder: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done'],
  defaultDateRange: 'month',
  fontSize: 'medium',
  interfaceDensity: 'comfortable',
  accentColor: '#3b82f6',
  reducedMotion: false,
  locale: 'en',
  screenReaderOptimized: false,
  highContrastMode: false,
  keyboardNavigationEnabled: true,
  focusIndicatorEnhanced: false,
  textScaling: 1.0,
  audioFeedbackEnabled: false,
  defaultTaskPriority: 'medium',
  autoSaveEnabled: true,
  quickActionButtons: ['create-task', 'assign-task', 'change-status'],
  defaultExportFormat: 'json',
  notificationFrequency: 'immediate',
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  quietHoursEnabled: false,
  keyboardShortcuts: {},
  analyticsPreferences: {},
  exportPreferences: {},
  customSettings: {},
}

// Preference Categories Configuration
export const PREFERENCE_CATEGORIES = [
  {
    name: 'dashboard',
    displayName: 'Dashboard & Views',
    description: 'Customize your default views and dashboard layout',
    icon: 'layout-dashboard',
    sortOrder: 0,
  },
  {
    name: 'display',
    displayName: 'Display & Theme',
    description: 'Personalize the appearance and theme settings',
    icon: 'palette',
    sortOrder: 1,
  },
  {
    name: 'notifications',
    displayName: 'Notifications',
    description: 'Control how and when you receive notifications',
    icon: 'bell',
    sortOrder: 2,
  },
  {
    name: 'accessibility',
    displayName: 'Accessibility',
    description: 'Accessibility options and inclusive design settings',
    icon: 'accessibility',
    sortOrder: 3,
  },
  {
    name: 'productivity',
    displayName: 'Productivity',
    description: 'Default values and workflow customizations',
    icon: 'zap',
    sortOrder: 4,
  },
  {
    name: 'advanced',
    displayName: 'Advanced',
    description: 'Keyboard shortcuts, integrations, and advanced settings',
    icon: 'settings',
    sortOrder: 5,
  },
] as const

export type PreferenceCategoryName = typeof PREFERENCE_CATEGORIES[number]['name']