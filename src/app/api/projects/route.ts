import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { projects } from '@/lib/schema';
import { createProjectSchema } from '@/lib/validation';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody
} from '@/lib/api-utils';

/**
 * GET /api/projects - List all projects
 * 
 * @returns Array of projects with basic information
 */
export async function GET() {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(projects.updatedAt);
    
    return createSuccessResponse(allProjects);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/projects - Create a new project
 * 
 * @param request - Request body containing project data
 * @returns Created project with generated ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const validatedData = createProjectSchema.parse(body);
    
    const [newProject] = await db
      .insert(projects)
      .values({
        ...validatedData,
        techStack: validatedData.techStack || null,
        repoUrl: validatedData.repoUrl || null,
      })
      .returning();
    
    return createSuccessResponse(newProject, 'Project created successfully', 201);
  } catch (error: unknown) {
    if (error?.name === 'ZodError') {
      return handleZodError(error);
    }
    
    if (error?.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}