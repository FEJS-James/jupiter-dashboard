import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
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
  role: text('role', { enum: ['coder', 'reviewer', 'devops', 'manager'] }).notNull(),
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
});

/**
 * Comments table - stores task comments
 */
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' })
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

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [comments.agentId],
    references: [agents.id],
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