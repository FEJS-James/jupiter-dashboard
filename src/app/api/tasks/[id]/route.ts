import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, projects, agents } from '@/lib/schema';
import { updateTaskSchema } from '@/lib/validation';
import { Task } from '@/types';
import { ZodError } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  extractIdFromParams
} from '@/lib/api-utils';
import { websocketManager } from '@/lib/websocket-manager';
import { NotificationService } from '@/lib/notification-service';

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

/**
 * GET /api/tasks/[id] - Get task details
 * 
 * @param request - Request object
 * @param params - Route parameters containing task ID
 * @returns Task details with project and agent info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    
    const taskDetails = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assignedAgent: tasks.assignedAgent,
        tags: tasks.tags,
        dueDate: tasks.dueDate,
        effort: tasks.effort,
        dependencies: tasks.dependencies,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: {
          id: projects.id,
          name: projects.name,
          status: projects.status,
        },
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
          status: agents.status,
        },
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(agents, eq(tasks.assignedAgent, agents.name))
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (taskDetails.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    return createSuccessResponse(taskDetails[0]);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/tasks/[id] - Update task
 * 
 * @param request - Request body containing updated task data
 * @param params - Route parameters containing task ID
 * @returns Updated task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = updateTaskSchema.parse(body);
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Verify assigned agent exists if provided
    if (validatedData.assignedAgent) {
      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.name, validatedData.assignedAgent))
        .limit(1);
      
      if (agent.length === 0) {
        return createErrorResponse('Assigned agent not found', 400);
      }
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = { ...validatedData };
    
    // Convert dueDate string to timestamp if provided
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }
    
    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    // Create notifications for various changes
    const oldTask = existingTask[0];

    // Handle assignment changes
    if (validatedData.assignedAgent !== undefined && validatedData.assignedAgent !== oldTask.assignedAgent) {
      if (validatedData.assignedAgent) {
        // Get new assignee
        const newAssignee = await db
          .select()
          .from(agents)
          .where(eq(agents.name, validatedData.assignedAgent))
          .limit(1);

        // Get previous assignee if exists
        let previousAssigneeId: number | undefined;
        if (oldTask.assignedAgent) {
          const previousAssignee = await db
            .select({ id: agents.id })
            .from(agents)
            .where(eq(agents.name, oldTask.assignedAgent))
            .limit(1);
          
          if (previousAssignee.length > 0) {
            previousAssigneeId = previousAssignee[0].id;
          }
        }

        if (newAssignee.length > 0) {
          if (oldTask.assignedAgent) {
            // Reassignment
            await NotificationService.notifyTaskReassigned(
              convertDbTaskToApiTask(updatedTask), 
              newAssignee[0].id, 
              previousAssigneeId
            );
          } else {
            // New assignment
            await NotificationService.notifyTaskAssigned(convertDbTaskToApiTask(updatedTask), newAssignee[0].id);
          }
        }
      }
    }

    // Handle status changes
    if (validatedData.status !== undefined && validatedData.status !== oldTask.status) {
      await NotificationService.notifyTaskStatusChanged(
        convertDbTaskToApiTask(updatedTask),
        oldTask.status,
        validatedData.status
      );
    }

    // Handle priority changes
    if (validatedData.priority !== undefined && validatedData.priority !== oldTask.priority) {
      await NotificationService.notifyTaskPriorityChanged(
        convertDbTaskToApiTask(updatedTask),
        oldTask.priority,
        validatedData.priority
      );
    }
    
    // Emit real-time event for task update
    const apiTask = convertDbTaskToApiTask(updatedTask);
    websocketManager.emitTaskUpdated(apiTask);
    
    return createSuccessResponse(apiTask, 'Task updated successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * DELETE /api/tasks/[id] - Delete task
 * 
 * @param request - Request object
 * @param params - Route parameters containing task ID
 * @returns Success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Delete task (cascade will handle related records)
    await db
      .delete(tasks)
      .where(eq(tasks.id, taskId));
    
    // Emit real-time event for task deletion
    websocketManager.emitTaskDeleted(taskId);
    
    return createSuccessResponse(null, 'Task deleted successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}