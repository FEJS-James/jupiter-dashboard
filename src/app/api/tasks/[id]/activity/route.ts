import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents, activity } from '@/lib/schema';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleDatabaseError,
  extractIdFromParams
} from '@/lib/api-utils';

/**
 * GET /api/tasks/[id]/activity - Get task activity history
 * 
 * @param request - Request object
 * @param params - Route parameters containing task ID
 * @returns Array of activity items with agent info
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
    
    // Get all activity for the task with agent info
    const taskActivity = await db
      .select({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        timestamp: activity.timestamp,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
        },
      })
      .from(activity)
      .leftJoin(agents, eq(activity.agentId, agents.id))
      .where(eq(activity.taskId, taskId))
      .orderBy(activity.timestamp);
    
    return createSuccessResponse(taskActivity);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/tasks/[id]/activity - Add activity entry
 * 
 * @param request - Request body containing activity data
 * @param params - Route parameters containing task ID
 * @returns Created activity entry with agent info
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await request.json();
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Verify agent exists if provided
    let agent = null;
    if (body.agentId) {
      const agentResult = await db
        .select()
        .from(agents)
        .where(eq(agents.id, body.agentId))
        .limit(1);
      
      if (agentResult.length === 0) {
        return createErrorResponse('Agent not found', 400);
      }
      agent = agentResult[0];
    }
    
    // Create activity entry
    const [newActivity] = await db
      .insert(activity)
      .values({
        taskId,
        projectId: existingTask[0].projectId,
        agentId: body.agentId || null,
        action: body.action,
        details: body.details || {},
      })
      .returning();
    
    // Return activity with agent info
    const activityWithAgent = {
      ...newActivity,
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        color: agent.color,
      } : null,
    };
    
    return createSuccessResponse(
      activityWithAgent, 
      'Activity entry created successfully', 
      201
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    if (error instanceof Error && error.message === 'Unexpected end of JSON input') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}