import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleDatabaseError
} from '@/lib/api-utils';

/**
 * GET /api/agents - List all agents with status
 * 
 * @returns Array of agents with their current status
 */
export async function GET() {
  try {
    const allAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        color: agents.color,
        avatarUrl: agents.avatarUrl,
        status: agents.status,
        currentTaskId: agents.currentTaskId,
        createdAt: agents.createdAt,
        updatedAt: agents.updatedAt,
      })
      .from(agents)
      .orderBy(agents.name);
    
    return createSuccessResponse(allAgents);
  } catch (error) {
    return handleDatabaseError(error);
  }
}