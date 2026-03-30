import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

/**
 * Projects table - stores project information
 */
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'] })
    .notNull()
    .default('planning'),
  techStack: text('tech_stack', { mode: 'json' }).$type<string[]>(),
  repoUrl: text('repo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
});

/**
 * Agents table - stores agent information
 */
export const agents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  role: text('role', { enum: ['coder', 'reviewer', 'devops', 'manager', 'tester'] }).notNull(),
  color: text('color').notNull().default('#3b82f6'),
  avatarUrl: text('avatar_url'),
  status: text('status', { enum: ['available', 'busy', 'offline'] })
    .notNull()
    .default('available'),
  currentTaskId: integer('current_task_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
});

/**
 * Tasks table - stores task information
 */
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { 
    enum: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked', 'archived'] 
  })
    .notNull()
    .default('backlog'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
    .notNull()
    .default('medium'),
  assignedAgent: text('assigned_agent')
    .references(() => agents.name),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  dueDate: integer('due_date', { mode: 'timestamp' }),
  effort: real('effort'), // Story points or hours
  dependencies: text('dependencies', { mode: 'json' }).$type<number[]>(), // Array of task IDs
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  // Indexes for query performance
  statusIdx: index('tasks_status_idx').on(table.status),
  priorityIdx: index('tasks_priority_idx').on(table.priority),
  projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
  assignedAgentIdx: index('tasks_assigned_agent_idx').on(table.assignedAgent),
  updatedAtIdx: index('tasks_updated_at_idx').on(table.updatedAt),
  // Composite indexes for common query patterns
  statusPriorityIdx: index('tasks_status_priority_idx').on(table.status, table.priority),
  projectStatusIdx: index('tasks_project_status_idx').on(table.projectId, table.status),
}));

/**
 * Activity table - stores activity/audit log
 */
export const activity = sqliteTable('activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id')
    .references(() => projects.id, { onDelete: 'cascade' }),
  taskId: integer('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id')
    .references(() => agents.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g., 'created', 'moved', 'assigned', 'commented'
  details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  // Indexes for query performance
  timestampIdx: index('activity_timestamp_idx').on(table.timestamp),
  projectIdIdx: index('activity_project_id_idx').on(table.projectId),
  agentIdIdx: index('activity_agent_id_idx').on(table.agentId),
  actionIdx: index('activity_action_idx').on(table.action),
  // Composite index for common query patterns
  timestampProjectIdx: index('activity_timestamp_project_idx').on(table.timestamp, table.projectId),
}));

/**
 * Comments table - stores task comments with enhanced features
 */
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'), // For nested replies - self-reference will be handled in relations
  content: text('content').notNull(),
  contentType: text('content_type', { enum: ['plain', 'markdown', 'rich'] })
    .notNull()
    .default('plain'),
  isEdited: integer('is_edited', { mode: 'boolean' })
    .notNull()
    .default(false),
  isDeleted: integer('is_deleted', { mode: 'boolean' })
    .notNull()
    .default(false),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedByAgentId: integer('deleted_by_agent_id')
    .references(() => agents.id, { onDelete: 'set null' }),
  mentions: text('mentions'), // JSON string of mentioned agent IDs
  attachments: text('attachments'), // JSON string of attachment URLs/paths
  metadata: text('metadata'), // JSON string of additional metadata
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
});

/**
 * Comment edit history table - tracks comment modifications
 */
export const commentHistory = sqliteTable('comment_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: integer('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  previousContent: text('previous_content').notNull(),
  editReason: text('edit_reason'), // Optional reason for edit
  editedByAgentId: integer('edited_by_agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  editedAt: integer('edited_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Comment reactions table - stores reactions/votes on comments
 */
export const commentReactions = sqliteTable('comment_reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: integer('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  reaction: text('reaction').notNull(), // 'like', 'dislike', 'helpful', etc.
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Comment notifications table - tracks comment mentions and replies
 */
export const commentNotifications = sqliteTable('comment_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipientAgentId: integer('recipient_agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['mention', 'reply', 'assigned'] }).notNull(),
  isRead: integer('is_read', { mode: 'boolean' })
    .notNull()
    .default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Relations definitions
 */
export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  activities: many(activity),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedTo: one(agents, {
    fields: [tasks.assignedAgent],
    references: [agents.name],
  }),
  comments: many(comments),
  activities: many(activity),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  currentTask: one(tasks, {
    fields: [agents.currentTaskId],
    references: [tasks.id],
  }),
  assignedTasks: many(tasks),
  comments: many(comments),
  activities: many(activity),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  project: one(projects, {
    fields: [activity.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [activity.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [activity.agentId],
    references: [agents.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [comments.agentId],
    references: [agents.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'parentComment',
  }),
  replies: many(comments, {
    relationName: 'parentComment',
  }),
  deletedByAgent: one(agents, {
    fields: [comments.deletedByAgentId],
    references: [agents.id],
  }),
  editHistory: many(commentHistory),
  reactions: many(commentReactions),
  notifications: many(commentNotifications),
}));

export const commentHistoryRelations = relations(commentHistory, ({ one }) => ({
  comment: one(comments, {
    fields: [commentHistory.commentId],
    references: [comments.id],
  }),
  editedByAgent: one(agents, {
    fields: [commentHistory.editedByAgentId],
    references: [agents.id],
  }),
}));

export const commentReactionsRelations = relations(commentReactions, ({ one }) => ({
  comment: one(comments, {
    fields: [commentReactions.commentId],
    references: [comments.id],
  }),
  agent: one(agents, {
    fields: [commentReactions.agentId],
    references: [agents.id],
  }),
}));

export const commentNotificationsRelations = relations(commentNotifications, ({ one }) => ({
  recipientAgent: one(agents, {
    fields: [commentNotifications.recipientAgentId],
    references: [agents.id],
  }),
  comment: one(comments, {
    fields: [commentNotifications.commentId],
    references: [comments.id],
  }),
  task: one(tasks, {
    fields: [commentNotifications.taskId],
    references: [tasks.id],
  }),
}));

/**
 * API Keys table - stores hashed API keys for role-based access control
 */
export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(), // SHA-256 hash of the plaintext key
  keyPrefix: text('key_prefix').notNull(), // First 8 chars of plaintext for identification
  name: text('name').notNull(), // Human-readable label
  role: text('role', { enum: ['coder', 'reviewer', 'tester', 'devops', 'orchestrator', 'admin'] }).notNull(),
  agentId: integer('agent_id')
    .references(() => agents.id, { onDelete: 'set null' }),
  isActive: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(true),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  keyIdx: index('api_keys_key_idx').on(table.key),
  roleIdx: index('api_keys_role_idx').on(table.role),
}));

/**
 * Pipeline Events table - audit log of pipeline state transitions
 */
export const pipelineEvents = sqliteTable('pipeline_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  agentRole: text('agent_role').notNull(),
  apiKeyId: integer('api_key_id')
    .references(() => apiKeys.id, { onDelete: 'set null' }),
  payload: text('payload'), // JSON string with submission details
  timestamp: text('timestamp')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  taskIdIdx: index('pipeline_events_task_id_idx').on(table.taskId),
  timestampIdx: index('pipeline_events_timestamp_idx').on(table.timestamp),
}));

/**
 * API Keys relations
 */
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  agent: one(agents, {
    fields: [apiKeys.agentId],
    references: [agents.id],
  }),
}));

/**
 * Pipeline Events relations
 */
export const pipelineEventsRelations = relations(pipelineEvents, ({ one }) => ({
  task: one(tasks, {
    fields: [pipelineEvents.taskId],
    references: [tasks.id],
  }),
  apiKey: one(apiKeys, {
    fields: [pipelineEvents.apiKeyId],
    references: [apiKeys.id],
  }),
}));

// Type exports for TypeScript
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type PipelineEvent = typeof pipelineEvents.$inferSelect;
export type NewPipelineEvent = typeof pipelineEvents.$inferInsert;

// Type exports for TypeScript
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Activity = typeof activity.$inferSelect;
export type NewActivity = typeof activity.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type CommentHistory = typeof commentHistory.$inferSelect;
export type NewCommentHistory = typeof commentHistory.$inferInsert;

export type CommentReaction = typeof commentReactions.$inferSelect;
export type NewCommentReaction = typeof commentReactions.$inferInsert;

export type CommentNotification = typeof commentNotifications.$inferSelect;
export type NewCommentNotification = typeof commentNotifications.$inferInsert;

/**
 * Notifications table - comprehensive notification system
 */
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipientId: integer('recipient_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  type: text('type', { 
    enum: ['task_assigned', 'task_reassigned', 'task_status_changed', 'task_priority_changed', 
           'comment_added', 'comment_mention', 'comment_reply', 'project_task_added', 
           'project_updated', 'system_announcement'] 
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  entityType: text('entity_type', { enum: ['task', 'project', 'comment', 'system'] }),
  entityId: integer('entity_id'),
  relatedEntityType: text('related_entity_type', { enum: ['task', 'project', 'comment', 'agent'] }),
  relatedEntityId: integer('related_entity_id'),
  actionUrl: text('action_url'), // URL to navigate to when clicked
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  isRead: integer('is_read', { mode: 'boolean' })
    .notNull()
    .default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] })
    .notNull()
    .default('normal'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // Optional expiration for temporary notifications
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  // Indexes for efficient querying
  recipientIdx: index('notifications_recipient_idx').on(table.recipientId),
  typeIdx: index('notifications_type_idx').on(table.type),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  expiresAtIdx: index('notifications_expires_at_idx').on(table.expiresAt), // For expiration cleanup queries
  // Composite indexes
  recipientUnreadIdx: index('notifications_recipient_unread_idx').on(table.recipientId, table.isRead),
  recipientCreatedIdx: index('notifications_recipient_created_idx').on(table.recipientId, table.createdAt),
  recipientTypeIdx: index('notifications_recipient_type_idx').on(table.recipientId, table.type),
}));

/**
 * Notification preferences table - user preferences for notification types
 */
export const notificationPreferences = sqliteTable('notification_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  notificationType: text('notification_type', { 
    enum: ['task_assigned', 'task_reassigned', 'task_status_changed', 'task_priority_changed', 
           'comment_added', 'comment_mention', 'comment_reply', 'project_task_added', 
           'project_updated', 'system_announcement'] 
  }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  emailEnabled: integer('email_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  pushEnabled: integer('push_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  // Unique constraint to prevent duplicates
  agentTypeUnique: index('notification_preferences_agent_type_unique').on(table.agentId, table.notificationType),
}));

/**
 * Notification relations
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(agents, {
    fields: [notifications.recipientId],
    references: [agents.id],
  }),
  task: one(tasks, {
    fields: [notifications.entityId],
    references: [tasks.id],
  }),
  project: one(projects, {
    fields: [notifications.entityId],
    references: [projects.id],
  }),
  comment: one(comments, {
    fields: [notifications.entityId],
    references: [comments.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  agent: one(agents, {
    fields: [notificationPreferences.agentId],
    references: [agents.id],
  }),
}));

// Update agents relations to include notifications
export const agentsRelationsUpdated = relations(agents, ({ one, many }) => ({
  currentTask: one(tasks, {
    fields: [agents.currentTaskId],
    references: [tasks.id],
  }),
  assignedTasks: many(tasks),
  comments: many(comments),
  activities: many(activity),
  notifications: many(notifications),
  notificationPreferences: many(notificationPreferences),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * User preferences table - comprehensive user preferences system
 */
export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  version: integer('version')
    .notNull()
    .default(1), // For schema migration support
  
  // Dashboard & View Preferences
  defaultLandingPage: text('default_landing_page', { 
    enum: ['dashboard', 'kanban', 'projects', 'analytics'] 
  }).notNull().default('dashboard'),
  defaultTaskView: text('default_task_view', { 
    enum: ['list', 'kanban', 'calendar'] 
  }).notNull().default('kanban'),
  tasksPerPage: integer('tasks_per_page')
    .notNull()
    .default(20),
  sidebarCollapsed: integer('sidebar_collapsed', { mode: 'boolean' })
    .notNull()
    .default(false),
  kanbanColumnsVisible: text('kanban_columns_visible', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'["backlog", "in-progress", "code-review", "testing", "deploying", "done"]'`),
  kanbanColumnOrder: text('kanban_column_order', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'["backlog", "in-progress", "code-review", "testing", "deploying", "done"]'`),
  defaultDateRange: text('default_date_range', { 
    enum: ['week', 'month', 'quarter', 'year'] 
  }).notNull().default('month'),
  
  // Display & Theme Preferences
  fontSize: text('font_size', { enum: ['small', 'medium', 'large'] })
    .notNull()
    .default('medium'),
  interfaceDensity: text('interface_density', { enum: ['compact', 'comfortable', 'spacious'] })
    .notNull()
    .default('comfortable'),
  accentColor: text('accent_color')
    .notNull()
    .default('#3b82f6'),
  customThemeVariant: text('custom_theme_variant'),
  reducedMotion: integer('reduced_motion', { mode: 'boolean' })
    .notNull()
    .default(false),
  locale: text('locale')
    .notNull()
    .default('en'),
  
  // Accessibility Preferences
  screenReaderOptimized: integer('screen_reader_optimized', { mode: 'boolean' })
    .notNull()
    .default(false),
  highContrastMode: integer('high_contrast_mode', { mode: 'boolean' })
    .notNull()
    .default(false),
  keyboardNavigationEnabled: integer('keyboard_navigation_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  focusIndicatorEnhanced: integer('focus_indicator_enhanced', { mode: 'boolean' })
    .notNull()
    .default(false),
  textScaling: real('text_scaling')
    .notNull()
    .default(1.0),
  audioFeedbackEnabled: integer('audio_feedback_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  
  // Productivity Preferences
  defaultTaskPriority: text('default_task_priority', { 
    enum: ['low', 'medium', 'high', 'urgent'] 
  }).notNull().default('medium'),
  defaultProjectId: integer('default_project_id')
    .references(() => projects.id, { onDelete: 'set null' }),
  autoSaveEnabled: integer('auto_save_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  quickActionButtons: text('quick_action_buttons', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'["create-task", "assign-task", "change-status"]'`),
  defaultExportFormat: text('default_export_format', { 
    enum: ['json', 'csv', 'xlsx', 'pdf'] 
  }).notNull().default('json'),
  
  // Notification Preferences (extended)
  notificationFrequency: text('notification_frequency', { 
    enum: ['immediate', 'batched', 'digest'] 
  }).notNull().default('immediate'),
  quietHoursStart: text('quiet_hours_start').default('22:00'),
  quietHoursEnd: text('quiet_hours_end').default('08:00'),
  quietHoursEnabled: integer('quiet_hours_enabled', { mode: 'boolean' })
    .notNull()
    .default(false),
  
  // Advanced Preferences (JSON storage for extensibility)
  keyboardShortcuts: text('keyboard_shortcuts', { mode: 'json' })
    .$type<Record<string, string>>()
    .default(sql`'{}'`),
  analyticsPreferences: text('analytics_preferences', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .default(sql`'{}'`),
  exportPreferences: text('export_preferences', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .default(sql`'{}'`),
  customSettings: text('custom_settings', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .default(sql`'{}'`),
  
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  // Unique constraint - one preference record per agent
  agentIdUnique: index('user_preferences_agent_id_unique').on(table.agentId),
  versionIdx: index('user_preferences_version_idx').on(table.version),
}));

/**
 * Preference categories table - for organizing preferences into logical groups
 */
export const preferenceCategories = sqliteTable('preference_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Preference history table - tracks changes for auditing and rollback
 */
export const preferenceHistory = sqliteTable('preference_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userPreferenceId: integer('user_preference_id')
    .notNull()
    .references(() => userPreferences.id, { onDelete: 'cascade' }),
  fieldName: text('field_name').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  changedAt: integer('changed_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userPreferenceIdIdx: index('preference_history_user_preference_id_idx').on(table.userPreferenceId),
  changedAtIdx: index('preference_history_changed_at_idx').on(table.changedAt),
}));

/**
 * User preferences relations
 */
export const userPreferencesRelations = relations(userPreferences, ({ one, many }) => ({
  agent: one(agents, {
    fields: [userPreferences.agentId],
    references: [agents.id],
  }),
  defaultProject: one(projects, {
    fields: [userPreferences.defaultProjectId],
    references: [projects.id],
  }),
  history: many(preferenceHistory),
}));

export const preferenceCategoriesRelations = relations(preferenceCategories, ({ many }) => ({
  // Future: preference items if we need more granular control
}));

export const preferenceHistoryRelations = relations(preferenceHistory, ({ one }) => ({
  userPreference: one(userPreferences, {
    fields: [preferenceHistory.userPreferenceId],
    references: [userPreferences.id],
  }),
}));

// Update agents relations to include preferences
export const agentsRelationsWithPreferences = relations(agents, ({ one, many }) => ({
  currentTask: one(tasks, {
    fields: [agents.currentTaskId],
    references: [tasks.id],
  }),
  assignedTasks: many(tasks),
  comments: many(comments),
  activities: many(activity),
  notifications: many(notifications),
  notificationPreferences: many(notificationPreferences),
  userPreferences: one(userPreferences),
}));

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type PreferenceCategory = typeof preferenceCategories.$inferSelect;
export type NewPreferenceCategory = typeof preferenceCategories.$inferInsert;

export type PreferenceHistory = typeof preferenceHistory.$inferSelect;
export type NewPreferenceHistory = typeof preferenceHistory.$inferInsert;