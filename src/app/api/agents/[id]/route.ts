import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
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
 * PATCH /api/agents/[id] - Update agent status
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