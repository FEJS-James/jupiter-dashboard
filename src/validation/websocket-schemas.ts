import { z } from 'zod'
import { TaskStatus, TaskPriority } from '@/types'

// User validation schema
export const ConnectedUserSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  avatar: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
  lastSeen: z.union([z.date(), z.string().transform(str => new Date(str))]),
  boardId: z.string().min(1).max(100).optional()
})

// Task validation schema
export const TaskSchema = z.object({
  id: z.number().int().positive(),
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked', 'archived'] as const),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const),
  assignedAgent: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  dueDate: z.string().optional(),
  effort: z.number().int().min(0).max(100).optional(),
  dependencies: z.array(z.number().int().positive()).max(50).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

// Presence validation schema
export const UserPresenceSchema = z.object({
  userId: z.string().min(1).max(100),
  status: z.enum(['viewing', 'editing', 'idle'] as const),
  taskId: z.number().int().positive().optional(),
  timestamp: z.union([z.date(), z.string().transform(str => new Date(str))])
})

// WebSocket event payload schemas
export const JoinEventSchema = z.object({
  boardId: z.string().min(1).max(100),
  user: ConnectedUserSchema
})

export const LeaveEventSchema = z.object({
  boardId: z.string().min(1).max(100)
})

export const TaskCreatedEventSchema = z.object({
  task: TaskSchema
})

export const TaskUpdatedEventSchema = z.object({
  task: TaskSchema
})

export const TaskDeletedEventSchema = z.object({
  taskId: z.number().int().positive()
})

export const TaskMovedEventSchema = z.object({
  taskId: z.number().int().positive(),
  fromStatus: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked', 'archived'] as const),
  toStatus: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked', 'archived'] as const),
  task: TaskSchema
})

export const UpdatePresenceEventSchema = z.object({
  presence: UserPresenceSchema
})

// Generic validation wrapper
export function validateEventPayload<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Validation failed: ${errorMessages}` }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}