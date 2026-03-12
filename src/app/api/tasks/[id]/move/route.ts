import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents } from '@/lib/schema';
import { moveTaskSchema } from '@/lib/validation';
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

/**
 * POST /api/tasks/[id]/move - Move task to new status/column
 * 
 * @param request - Request body containing new status and optional agent
 * @param params - Route parameters containing task ID
 * @returns Updated task with new status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = moveTaskSchema.parse(body);
    
    // Check if task exists and get current status
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }

    const previousStatus = existingTask[0].status;
    
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
    
    // Update task status and optionally assigned agent
    const updateData: { status: 'backlog' | 'in-progress' | 'code-review' | 'testing' | 'deploying' | 'done' | 'blocked'; assignedAgent?: string | null } = {
      status: validatedData.status,
    };
    
    if (validatedData.assignedAgent !== undefined) {
      updateData.assignedAgent = validatedData.assignedAgent;
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Emit real-time event for task move
    websocketManager.emitTaskMoved(taskId, previousStatus, validatedData.status, updatedTask);
    
    return createSuccessResponse(
      updatedTask, 
      `Task moved to ${validatedData.status}`
    );
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