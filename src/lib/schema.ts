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
    enum: ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked'] 
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
});

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
  // Composite indexes
  recipientUnreadIdx: index('notifications_recipient_unread_idx').on(table.recipientId, table.isRead),
  recipientCreatedIdx: index('notifications_recipient_created_idx').on(table.recipientId, table.createdAt),
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