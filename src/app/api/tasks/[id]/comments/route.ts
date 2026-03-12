import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents, comments } from '@/lib/schema';
import { addCommentSchema } from '@/lib/validation';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  extractIdFromParams
} from '@/lib/api-utils';

/**
 * POST /api/tasks/[id]/comments - Add comment to task
 * 
 * @param request - Request body containing comment content and agent ID
 * @param params - Route parameters containing task ID
 * @returns Created comment with agent info
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = addCommentSchema.parse(body);
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Verify agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, validatedData.agentId))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Agent not found', 400);
    }
    
    // Create comment
    const [newComment] = await db
      .insert(comments)
      .values({
        taskId,
        agentId: validatedData.agentId,
        content: validatedData.content,
      })
      .returning();
    
    // Return comment with agent info
    const commentWithAgent = {
      ...newComment,
      agent: {
        id: agent[0].id,
        name: agent[0].name,
        role: agent[0].role,
        color: agent[0].color,
      },
    };
    
    return createSuccessResponse(
      commentWithAgent, 
      'Comment added successfully', 
      201
    );
  } catch (error: unknown) {
    if (error?.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    if (error?.name === 'ZodError') {
      return handleZodError(error);
    }
    
    if (error?.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * GET /api/tasks/[id]/comments - Get all comments for a task
 * 
 * @param request - Request object
 * @param params - Route parameters containing task ID
 * @returns Array of comments with agent info
 */
export async function GET(
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
    
    // Get all comments for the task with agent info
    const taskComments = await db
      .select({
        id: comments.id,
        taskId: comments.taskId,
        content: comments.content,
        timestamp: comments.timestamp,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
        },
      })
      .from(comments)
      .leftJoin(agents, eq(comments.agentId, agents.id))
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.timestamp);
    
    return createSuccessResponse(taskComments);
  } catch (error: unknown) {
    if (error?.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}