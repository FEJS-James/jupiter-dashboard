import { z } from 'zod';

/**
 * Validation schemas for API endpoints
 */

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).default('planning'),
  techStack: z.array(z.string()).optional(),
  repoUrl: z.string().url().optional().or(z.literal('')),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on-hold', 'completed', 'cancelled']).optional(),
  techStack: z.array(z.string()).optional(),
  repoUrl: z.string().url().optional().or(z.literal('')),
});

// Task schemas
export const createTaskSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().optional(),
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedAgent: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().or(z.null()),
  effort: z.number().optional(),
  dependencies: z.array(z.number().int()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedAgent: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional().or(z.null()),
  effort: z.number().optional(),
  dependencies: z.array(z.number().int()).optional(),
});

export const taskFiltersSchema = z.object({
  project: z.string().optional(),
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']).optional(),
  agent: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const moveTaskSchema = z.object({
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']),
  assignedAgent: z.string().optional().or(z.null()),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  agentId: z.number().int().positive(),
});

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(50),
  role: z.enum(['coder', 'reviewer', 'devops', 'manager', 'tester']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').default('#3b82f6'),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['available', 'busy', 'offline']).default('available'),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  role: z.enum(['coder', 'reviewer', 'devops', 'manager', 'tester']).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['available', 'busy', 'offline']).optional(),
  currentTaskId: z.number().int().positive().optional().or(z.null()),
});

export const agentFiltersSchema = z.object({
  role: z.enum(['coder', 'reviewer', 'devops', 'manager', 'tester']).optional(),
  status: z.enum(['available', 'busy', 'offline']).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

// Common response schemas
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

export const successResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
});