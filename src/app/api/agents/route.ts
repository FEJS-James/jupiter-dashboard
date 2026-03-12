import { NextRequest } from 'next/server';
import { eq, like, or, count, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, tasks } from '@/lib/schema';
import { createAgentSchema, agentFiltersSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { 
  createSuccessResponse, 
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
    
    // Build query - simpler approach
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
    
    let allAgents;
    
    // Apply filters conditionally
    if (filters.role && filters.status && filters.search) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(
          and(
            eq(agents.role, filters.role),
            eq(agents.status, filters.status),
            or(
              like(agents.name, `%${filters.search}%`),
              like(agents.role, `%${filters.search}%`)
            )
          )
        )
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.role && filters.status) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(
          and(
            eq(agents.role, filters.role),
            eq(agents.status, filters.status)
          )
        )
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.role && filters.search) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(
          and(
            eq(agents.role, filters.role),
            or(
              like(agents.name, `%${filters.search}%`),
              like(agents.role, `%${filters.search}%`)
            )
          )
        )
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.status && filters.search) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(
          and(
            eq(agents.status, filters.status),
            or(
              like(agents.name, `%${filters.search}%`),
              like(agents.role, `%${filters.search}%`)
            )
          )
        )
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.role) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(eq(agents.role, filters.role))
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.status) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(eq(agents.status, filters.status))
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else if (filters.search) {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .where(
          or(
            like(agents.name, `%${filters.search}%`),
            like(agents.role, `%${filters.search}%`)
          )
        )
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    } else {
      allAgents = await db
        .select(baseSelect)
        .from(agents)
        .orderBy(agents.name)
        .limit(filters.limit || 100)
        .offset(filters.offset || 0);
    }
    
    // Get task counts for each agent
    const agentsWithCounts = await Promise.all(
      allAgents.map(async (agent) => {
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
        
        return {
          ...agent,
          taskCounts: {
            total: totalTasks.count,
            active: activeTasks.count,
          },
        };
      })
    );
    
    return createSuccessResponse(agentsWithCounts);
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