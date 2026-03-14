import { NextRequest } from 'next/server';
import { eq, and, desc, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, projects, agents } from '@/lib/schema';
import { z } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
} from '@/lib/api-utils';

const archivedFiltersSchema = z.object({
  search: z.string().optional(),
  project: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  agent: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

/**
 * GET /api/tasks/archived - List archived tasks with pagination, search, and filters
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const filters = archivedFiltersSchema.parse(rawParams);

    // Build query conditions — always filter to archived status
    const conditions = [eq(tasks.status, 'archived')];

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters.agent) {
      conditions.push(eq(tasks.assignedAgent, filters.agent));
    }

    if (filters.search) {
      conditions.push(like(tasks.title, `%${filters.search}%`));
    }

    if (filters.project) {
      const projectId = parseInt(filters.project, 10);
      if (!isNaN(projectId)) {
        conditions.push(eq(tasks.projectId, projectId));
      }
    }

    // Get total count of archived tasks (for badge)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.status, 'archived'));
    
    const totalArchived = countResult[0]?.count ?? 0;

    // Execute query with joins
    const query = db
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
      .where(and(...conditions))
      .orderBy(desc(tasks.updatedAt));

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query.limit(limit).offset(offset);

    const archivedTasks = await query;

    return createSuccessResponse({
      tasks: archivedTasks,
      total: totalArchived,
      limit,
      offset,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return handleZodError(error);
    }
    return handleDatabaseError(error);
  }
}
