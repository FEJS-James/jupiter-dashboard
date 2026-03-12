import { NextRequest } from 'next/server';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents, projects } from '@/lib/schema';
import { z } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody
} from '@/lib/api-utils';
import { websocketManager } from '@/lib/websocket-manager';
import { ActivityLogger } from '@/lib/activity-logger';
import { NotificationService } from '@/lib/notification-service';
import { Task } from '@/types';

// Convert database task to API task type (null to undefined)
function convertDbTaskToApiTask(dbTask: any): Task {
  return {
    ...dbTask,
    description: dbTask.description ?? undefined,
    dueDate: dbTask.dueDate?.toISOString() ?? undefined,
    assignedAgent: dbTask.assignedAgent ?? undefined,
    effort: dbTask.effort ?? undefined,
    tags: dbTask.tags ?? undefined,
    createdAt: dbTask.createdAt.toISOString(),
    updatedAt: dbTask.updatedAt.toISOString()
  };
}

// Validation schemas for bulk operations
const bulkMoveSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  status: z.enum(['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked']),
  preserveAssignments: z.boolean().optional().default(true),
});

const bulkAssignSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  assignedAgent: z.string().nullable(), // null to unassign
});

const bulkPrioritySchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

const bulkDeleteSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  reason: z.string().optional(),
});

const bulkTagSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  action: z.enum(['add', 'remove', 'replace']),
});

const bulkEditSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1, 'At least one task ID is required'),
  updates: z.object({
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().or(z.null()),
    effort: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }).strict(),
});

/**
 * POST /api/tasks/bulk - Perform bulk operations on tasks
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const operation = url.searchParams.get('operation');
    
    if (!operation) {
      return createErrorResponse('Operation parameter is required', 400);
    }

    const body = await parseRequestBody(request);
    
    switch (operation) {
      case 'move':
        return await handleBulkMove(body);
      case 'assign':
        return await handleBulkAssign(body);
      case 'priority':
        return await handleBulkPriority(body);
      case 'delete':
        return await handleBulkDelete(body);
      case 'tag':
        return await handleBulkTag(body);
      case 'edit':
        return await handleBulkEdit(body);
      default:
        return createErrorResponse(`Unsupported operation: ${operation}`, 400);
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return handleZodError(error);
    }
    
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * Handle bulk status move operation
 */
async function handleBulkMove(body: unknown) {
  const validatedData = bulkMoveSchema.parse(body);
  const { taskIds, status, preserveAssignments } = validatedData;

  // Start transaction
  return await db.transaction(async (tx) => {
    // Get current task states
    const existingTasks = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (existingTasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Update tasks
    const updateData: any = { status };
    
    // If not preserving assignments and status requires specific agent, handle assignment logic
    if (!preserveAssignments) {
      // Logic for auto-assignment based on status could go here
      // For now, we preserve existing assignments
    }

    const updatedTasks = await tx
      .update(tasks)
      .set(updateData)
      .where(inArray(tasks.id, taskIds))
      .returning();

    // Log activities in batch
    const activityPromises = existingTasks.map(task => 
      ActivityLogger.logTaskMoved(
        task.id,
        task.projectId,
        task.status,
        status,
        undefined, // System operation
        { bulkOperation: true, taskCount: taskIds.length }
      )
    );
    await Promise.all(activityPromises);

    // Emit real-time events for bulk operation
    websocketManager.emitBulkOperation('move', taskIds, { 
      fromStatus: existingTasks.map(t => t.status),
      toStatus: status,
      preserveAssignments 
    });
    websocketManager.emitBulkTasksUpdated(updatedTasks, 'move');

    return createSuccessResponse(
      updatedTasks, 
      `Successfully moved ${updatedTasks.length} tasks to ${status}`
    );
  });
}

/**
 * Handle bulk assignment operation
 */
async function handleBulkAssign(body: unknown) {
  const validatedData = bulkAssignSchema.parse(body);
  const { taskIds, assignedAgent } = validatedData;

  // Verify agent exists if assigning (not unassigning)
  if (assignedAgent) {
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.name, assignedAgent))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Assigned agent not found', 400);
    }
  }

  return await db.transaction(async (tx) => {
    // Get current task states
    const existingTasks = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (existingTasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Update tasks
    const updatedTasks = await tx
      .update(tasks)
      .set({ assignedAgent })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // Log activities in batch (only if assigning, not unassigning)
    const activityPromises = assignedAgent 
      ? existingTasks.map(task => 
          ActivityLogger.logTaskAssigned(
            task.id,
            task.projectId,
            assignedAgent,
            undefined, // agentId not available in this context 
            { 
              bulkOperation: true, 
              taskCount: taskIds.length,
              previousAgent: task.assignedAgent ?? undefined
            }
          )
        )
      : [];
    await Promise.all(activityPromises);

    // Send notifications for assignment
    if (assignedAgent) {
      const agent = await tx
        .select()
        .from(agents)
        .where(eq(agents.name, assignedAgent))
        .limit(1);
      
      if (agent.length > 0) {
        await Promise.all(
          updatedTasks.map(task => 
            NotificationService.notifyTaskAssigned(convertDbTaskToApiTask(task), agent[0].id)
          )
        );
      }
    }

    // Emit real-time events for bulk assignment
    websocketManager.emitBulkOperation('assign', taskIds, { 
      assignedAgent,
      previousAgents: existingTasks.map(t => t.assignedAgent)
    });
    websocketManager.emitBulkTasksUpdated(updatedTasks, 'assign');

    return createSuccessResponse(
      updatedTasks, 
      assignedAgent 
        ? `Successfully assigned ${updatedTasks.length} tasks to ${assignedAgent}`
        : `Successfully unassigned ${updatedTasks.length} tasks`
    );
  });
}

/**
 * Handle bulk priority update operation
 */
async function handleBulkPriority(body: unknown) {
  const validatedData = bulkPrioritySchema.parse(body);
  const { taskIds, priority } = validatedData;

  return await db.transaction(async (tx) => {
    // Get current task states
    const existingTasks = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (existingTasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Update tasks
    const updatedTasks = await tx
      .update(tasks)
      .set({ priority })
      .where(inArray(tasks.id, taskIds))
      .returning();

    // Log activities in batch
    const activityPromises = existingTasks.map(task => 
      ActivityLogger.logTaskUpdated(
        task.id,
        task.projectId,
        undefined, // System operation
        { 
          priority: { from: task.priority, to: priority },
          bulkOperation: true,
          taskCount: taskIds.length 
        }
      )
    );
    await Promise.all(activityPromises);

    // Emit real-time events for bulk priority update
    websocketManager.emitBulkOperation('priority', taskIds, { 
      priority,
      previousPriorities: existingTasks.map(t => t.priority)
    });
    websocketManager.emitBulkTasksUpdated(updatedTasks, 'priority');

    return createSuccessResponse(
      updatedTasks, 
      `Successfully updated priority to ${priority} for ${updatedTasks.length} tasks`
    );
  });
}

/**
 * Handle bulk delete operation
 */
async function handleBulkDelete(body: unknown) {
  const validatedData = bulkDeleteSchema.parse(body);
  const { taskIds, reason } = validatedData;

  return await db.transaction(async (tx) => {
    // Get tasks to delete (for activity logging)
    const tasksToDelete = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (tasksToDelete.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Log activities before deletion
    const activityPromises = tasksToDelete.map(task => 
      ActivityLogger.logTaskDeleted(
        task.id,
        task.projectId,
        undefined, // System operation
        { 
          title: task.title,
          reason,
          bulkOperation: true,
          taskCount: taskIds.length 
        }
      )
    );
    await Promise.all(activityPromises);

    // Delete tasks (cascade will handle related records)
    const deletedTasks = await tx
      .delete(tasks)
      .where(inArray(tasks.id, taskIds))
      .returning({ id: tasks.id, title: tasks.title, projectId: tasks.projectId });

    // Emit real-time events for bulk delete
    websocketManager.emitBulkOperation('delete', taskIds, { 
      reason,
      deletedTasks: deletedTasks.map(t => ({ id: t.id, title: t.title }))
    });

    return createSuccessResponse(
      { deletedCount: deletedTasks.length, taskIds }, 
      `Successfully deleted ${deletedTasks.length} tasks`
    );
  });
}

/**
 * Handle bulk tag management operation
 */
async function handleBulkTag(body: unknown) {
  const validatedData = bulkTagSchema.parse(body);
  const { taskIds, tags, action } = validatedData;

  return await db.transaction(async (tx) => {
    // Get current task states
    const existingTasks = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (existingTasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Process tags based on action
    const updatedTasks = [];
    
    for (const task of existingTasks) {
      const currentTags = task.tags || [];
      let newTags: string[];
      
      switch (action) {
        case 'add':
          newTags = [...new Set([...currentTags, ...tags])];
          break;
        case 'remove':
          newTags = currentTags.filter(tag => !tags.includes(tag));
          break;
        case 'replace':
          newTags = tags;
          break;
      }
      
      const [updatedTask] = await tx
        .update(tasks)
        .set({ tags: newTags })
        .where(eq(tasks.id, task.id))
        .returning();
      
      updatedTasks.push(updatedTask);
    }

    // Log activities in batch
    const activityPromises = existingTasks.map(task => 
      ActivityLogger.logTaskUpdated(
        task.id,
        task.projectId,
        undefined, // System operation
        { 
          tags: { action, tags },
          bulkOperation: true,
          taskCount: taskIds.length 
        }
      )
    );
    await Promise.all(activityPromises);

    // Emit real-time events for bulk tag operation
    websocketManager.emitBulkOperation('tag', taskIds, { 
      action,
      tags,
      previousTags: existingTasks.map(t => t.tags || [])
    });
    websocketManager.emitBulkTasksUpdated(updatedTasks, 'tag');

    return createSuccessResponse(
      updatedTasks, 
      `Successfully ${action} tags for ${updatedTasks.length} tasks`
    );
  });
}

/**
 * Handle bulk edit operation
 */
async function handleBulkEdit(body: unknown) {
  const validatedData = bulkEditSchema.parse(body);
  const { taskIds, updates } = validatedData;

  return await db.transaction(async (tx) => {
    // Get current task states
    const existingTasks = await tx
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));

    if (existingTasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.effort !== undefined) updateData.effort = updates.effort;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    // Update tasks
    const updatedTasks = await tx
      .update(tasks)
      .set(updateData)
      .where(inArray(tasks.id, taskIds))
      .returning();

    // Log activities in batch
    const activityPromises = existingTasks.map(task => 
      ActivityLogger.logTaskUpdated(
        task.id,
        task.projectId,
        undefined, // System operation
        { 
          updates,
          bulkOperation: true,
          taskCount: taskIds.length 
        }
      )
    );
    await Promise.all(activityPromises);

    // Emit real-time events for bulk edit
    websocketManager.emitBulkOperation('edit', taskIds, { 
      updates,
      previousData: existingTasks.map(t => ({
        description: t.description,
        dueDate: t.dueDate,
        effort: t.effort,
        tags: t.tags
      }))
    });
    websocketManager.emitBulkTasksUpdated(updatedTasks, 'edit');

    return createSuccessResponse(
      updatedTasks, 
      `Successfully updated ${updatedTasks.length} tasks`
    );
  });
}