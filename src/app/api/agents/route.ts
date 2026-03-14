import { NextRequest } from 'next/server';
import { eq, like, or, count, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, tasks } from '@/lib/schema';
import { createAgentSchema, agentFiltersSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { 
  createSuccessResponse,
  createCachedSuccessResponse,
  createErrorResponse,
  handleDatabaseError,
  handleZodError,
  parseRequestBody
} from '@/lib/api-utils';

/**
 * GET /api/agents - List all agents with status and filtering
 * 
 * @param request - Request with optional query parameters for filtering
 * @returns Array of agents with their current status and task counts
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    let filters;
    try {
      filters = agentFiltersSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error);
      }
      throw error;
    }
    
    // Build query with conditional filtering
    const baseSelect = {
      id: agents.id,
      name: agents.name,
      role: agents.role,
      color: agents.color,
      avatarUrl: agents.avatarUrl,
      status: agents.status,
      currentTaskId: agents.currentTaskId,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    };
    
    // Build where conditions dynamically
    let conditions = [];
    if (filters.role) conditions.push(eq(agents.role, filters.role));
    if (filters.status) conditions.push(eq(agents.status, filters.status));
    if (filters.search) conditions.push(or(
      like(agents.name, `%${filters.search}%`),
      like(agents.role, `%${filters.search}%`)
    ));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const allAgents = await db
      .select(baseSelect)
      .from(agents)
      .where(whereClause)
      .orderBy(agents.name)
      .limit(filters.limit || 100)
      .offset(filters.offset || 0);
    
    // Get task counts in a single query (fixes N+1)
    const taskCounts = await db
      .select({
        assignedAgent: tasks.assignedAgent,
        total: count(),
        active: sql<number>`SUM(CASE WHEN ${tasks.status} = 'in-progress' THEN 1 ELSE 0 END)`,
      })
      .from(tasks)
      .where(sql`${tasks.assignedAgent} IS NOT NULL`)
      .groupBy(tasks.assignedAgent);
    
    // Build lookup map
    const countsMap = new Map(
      taskCounts.map(tc => [tc.assignedAgent, { total: tc.total, active: tc.active }])
    );
    
    const agentsWithCounts = allAgents.map(agent => ({
      ...agent,
      taskCounts: countsMap.get(agent.name) || { total: 0, active: 0 },
    }));
    
    return createCachedSuccessResponse(agentsWithCounts, undefined, { maxAge: 15, swr: 60 });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/agents - Create a new agent
 * 
 * @param request - Request body containing agent data
 * @returns Created agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const validatedData = createAgentSchema.parse(body);
    
    // Check if agent with this name already exists
    const existingAgent = await db
      .select()
      .from(agents)
      .where(eq(agents.name, validatedData.name))
      .limit(1);
    
    if (existingAgent.length > 0) {
      return createErrorResponse('Agent with this name already exists', 400);
    }
    
    // Create agent
    const [newAgent] = await db
      .insert(agents)
      .values(validatedData)
      .returning();
    
    return createSuccessResponse(newAgent, 'Agent created successfully');
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}