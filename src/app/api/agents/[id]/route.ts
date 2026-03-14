import { NextRequest } from 'next/server';
import { eq, count, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, tasks } from '@/lib/schema';
import { updateAgentSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  extractIdFromParams
} from '@/lib/api-utils';

/**
 * GET /api/agents/[id] - Get agent details with task statistics
 * 
 * @param params - Route parameters containing agent ID
 * @returns Agent details with task statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = extractIdFromParams({ id });
    
    // Get agent details
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (!agent) {
      return createErrorResponse('Agent not found', 404);
    }
    
    // Get task statistics
    const [totalTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.assignedAgent, agent.name));
    
    const [activeTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedAgent, agent.name),
          eq(tasks.status, 'in-progress')
        )
      );
    
    const [completedTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedAgent, agent.name),
          eq(tasks.status, 'done')
        )
      );
    
    // Get recent tasks (last 10)
    const recentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.assignedAgent, agent.name))
      .orderBy(tasks.updatedAt)
      .limit(10);
    
    const agentWithStats = {
      ...agent,
      statistics: {
        totalTasks: totalTasks.count,
        activeTasks: activeTasks.count,
        completedTasks: completedTasks.count,
      },
      recentTasks,
    };
    
    return createSuccessResponse(agentWithStats);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid agent ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/agents/[id] - Update agent data
 * 
 * @param request - Request body containing updated agent data
 * @param params - Route parameters containing agent ID
 * @returns Updated agent
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = updateAgentSchema.parse(body);
    
    // Check if agent exists
    const existingAgent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (existingAgent.length === 0) {
      return createErrorResponse('Agent not found', 404);
    }
    
    // If setting currentTaskId, verify task exists
    if (validatedData.currentTaskId) {
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, validatedData.currentTaskId))
        .limit(1);
      
      if (task.length === 0) {
        return createErrorResponse('Task not found', 400);
      }
    }
    
    // Update agent
    const [updatedAgent] = await db
      .update(agents)
      .set(validatedData)
      .where(eq(agents.id, agentId))
      .returning();
    
    return createSuccessResponse(updatedAgent, 'Agent updated successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid agent ID', 400);
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
 * DELETE /api/agents/[id] - Archive/delete an agent
 * 
 * @param params - Route parameters containing agent ID
 * @returns Success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agentId = extractIdFromParams({ id });
    
    // Check if agent exists
    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (!existingAgent) {
      return createErrorResponse('Agent not found', 404);
    }
    
    // Check if agent has active tasks
    const [activeTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assignedAgent, existingAgent.name),
          eq(tasks.status, 'in-progress')
        )
      );
    
    if (activeTasks.count > 0) {
      return createErrorResponse(
        `Cannot delete agent ${existingAgent.name} - they have ${activeTasks.count} active task(s). Please reassign or complete these tasks first.`,
        400
      );
    }
    
    // Unassign agent from any remaining tasks
    await db
      .update(tasks)
      .set({ assignedAgent: null })
      .where(eq(tasks.assignedAgent, existingAgent.name));
    
    // Delete the agent
    await db
      .delete(agents)
      .where(eq(agents.id, agentId));
    
    return createSuccessResponse(
      { id: agentId },
      `Agent ${existingAgent.name} deleted successfully`
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid agent ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}