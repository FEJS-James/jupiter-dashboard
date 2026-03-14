import { NextRequest } from 'next/server';
import { eq, and, desc, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, projects, agents } from '@/lib/schema';
import { createTaskSchema, taskFiltersSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  toISO,
  parseJsonField
} from '@/lib/api-utils';
import { websocketManager } from '@/lib/websocket-manager';
import { ActivityLogger } from '@/lib/activity-logger';
import { NotificationService } from '@/lib/notification-service';
import { Task, Project } from '@/types';

// Convert database task to API task type (null to undefined)
function convertDbTaskToApiTask(dbTask: any): Task {
  return {
    ...dbTask,
    description: dbTask.description ?? undefined,
    dueDate: dbTask.dueDate ? toISO(dbTask.dueDate) : undefined,
    assignedAgent: dbTask.assignedAgent ?? undefined,
    effort: dbTask.effort ?? undefined,
    tags: parseJsonField<string[]>(dbTask.tags),
    createdAt: toISO(dbTask.createdAt),
    updatedAt: toISO(dbTask.updatedAt)
  };
}

// Convert database project to API project type (null to undefined)
function convertDbProjectToApiProject(dbProject: any): Project {
  return {
    ...dbProject,
    description: dbProject.description ?? undefined,
    techStack: dbProject.techStack ?? undefined,
    repoUrl: dbProject.repoUrl ?? undefined,
    createdAt: toISO(dbProject.createdAt),
    updatedAt: toISO(dbProject.updatedAt)
  };
}

/**
 * GET /api/tasks - List tasks with filters
 * 
 * @param request - Request with query parameters for filtering
 * @returns Filtered list of tasks with project and agent info
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const filters = taskFiltersSchema.parse(rawParams);
    
    // Check if archived tasks should be included
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    
    // Build query conditions
    const conditions = [];
    
    // Exclude archived tasks by default unless explicitly requested
    if (!includeArchived && !filters.status) {
      conditions.push(ne(tasks.status, 'archived'));
    }
    
    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    
    if (filters.agent) {
      conditions.push(eq(tasks.assignedAgent, filters.agent));
    }
    
    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }
    
    if (filters.project) {
      // Handle both project ID and project name
      const projectId = parseInt(filters.project, 10);
      if (!isNaN(projectId)) {
        conditions.push(eq(tasks.projectId, projectId));
      } else {
        // If not a number, try to find project by name
        const project = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.name, filters.project))
          .limit(1);
        
        if (project.length > 0) {
          conditions.push(eq(tasks.projectId, project[0].id));
        } else {
          // If project not found, return empty result
          return createSuccessResponse([]);
        }
      }
    }
    
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
      .orderBy(desc(tasks.updatedAt));
    
    // Apply conditions if any
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    // Apply pagination
    if (filters.limit) {
      query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query.offset(filters.offset);
    }
    
    const tasksWithDetails = await query;
    
    return createSuccessResponse(tasksWithDetails);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/tasks - Create a new task
 * 
 * @param request - Request body containing task data
 * @returns Created task with generated ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const validatedData = createTaskSchema.parse(body);
    
    // Verify project exists
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, validatedData.projectId))
      .limit(1);
    
    if (project.length === 0) {
      return createErrorResponse('Project not found', 400);
    }
    
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
    
    // Convert dueDate string to timestamp if provided
    const taskData = {
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      tags: validatedData.tags || null,
      dependencies: validatedData.dependencies || null,
    };
    
    const [newTask] = await db
      .insert(tasks)
      .values(taskData)
      .returning();
    
    // Log activity for task creation
    await ActivityLogger.logTaskCreated(
      newTask.id, 
      newTask.projectId, 
      undefined, // No specific agent ID for creation, could be system
      {
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
        assignedAgent: newTask.assignedAgent,
      }
    );

    // Create notifications for task assignment
    if (newTask.assignedAgent) {
      const assignedAgent = await db
        .select()
        .from(agents)
        .where(eq(agents.name, newTask.assignedAgent))
        .limit(1);
      
      if (assignedAgent.length > 0) {
        await NotificationService.notifyTaskAssigned(convertDbTaskToApiTask(newTask), assignedAgent[0].id);
      }
    }

    // Create notifications for project team members about new task
    await NotificationService.notifyProjectTaskAdded(convertDbTaskToApiTask(newTask), convertDbProjectToApiProject(project[0]));
    
    // Emit real-time event for task creation
    console.log('WebSocket manager ready status:', websocketManager.isReady());
    console.log('WebSocket manager IO instance:', !!websocketManager.getIO());
    websocketManager.emitTaskCreated(newTask);
    
    return createSuccessResponse(newTask, 'Task created successfully', 201);
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