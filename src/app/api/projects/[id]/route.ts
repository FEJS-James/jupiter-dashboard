import { NextRequest } from 'next/server';
import { eq, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { projects, tasks } from '@/lib/schema';
import { updateProjectSchema } from '@/lib/validation';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  extractIdFromParams
} from '@/lib/api-utils';

/**
 * GET /api/projects/[id] - Get project with stats
 * 
 * @param request - Request object
 * @param params - Route parameters containing project ID
 * @returns Project details with task statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = extractIdFromParams({ id });
    
    // Get project details
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (project.length === 0) {
      return createErrorResponse('Project not found', 404);
    }
    
    // Get task statistics
    const taskStats = await db
      .select({
        status: tasks.status,
        count: count()
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .groupBy(tasks.status);
    
    const stats = taskStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);
    
    // Ensure all statuses are represented
    const allStatuses = ['backlog', 'in-progress', 'code-review', 'testing', 'deploying', 'done', 'blocked'];
    allStatuses.forEach(status => {
      if (!stats[status]) {
        stats[status] = 0;
      }
    });
    
    const projectWithStats = {
      ...project[0],
      stats,
      totalTasks: Object.values(stats).reduce((sum, count) => sum + count, 0)
    };
    
    return createSuccessResponse(projectWithStats);
  } catch (error: unknown) {
    if (error?.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid project ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/projects/[id] - Update project
 * 
 * @param request - Request body containing updated project data
 * @param params - Route parameters containing project ID
 * @returns Updated project
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = updateProjectSchema.parse(body);
    
    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (existingProject.length === 0) {
      return createErrorResponse('Project not found', 404);
    }
    
    // Update project
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...validatedData,
        // Handle optional fields properly
        techStack: validatedData.techStack !== undefined ? validatedData.techStack : undefined,
        repoUrl: validatedData.repoUrl !== undefined ? validatedData.repoUrl || null : undefined,
      })
      .where(eq(projects.id, projectId))
      .returning();
    
    return createSuccessResponse(updatedProject, 'Project updated successfully');
  } catch (error: unknown) {
    if (error?.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid project ID', 400);
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
 * DELETE /api/projects/[id] - Archive project
 * 
 * @param request - Request object
 * @param params - Route parameters containing project ID
 * @returns Success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = extractIdFromParams({ id });
    
    // Check if project exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    
    if (existingProject.length === 0) {
      return createErrorResponse('Project not found', 404);
    }
    
    // Instead of deleting, we archive by setting status to 'cancelled'
    // This preserves data integrity and history
    const [archivedProject] = await db
      .update(projects)
      .set({ status: 'cancelled' })
      .where(eq(projects.id, projectId))
      .returning();
    
    return createSuccessResponse(
      archivedProject, 
      'Project archived successfully'
    );
  } catch (error: unknown) {
    if (error?.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid project ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}