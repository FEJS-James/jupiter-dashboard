/**
 * GET /api/tasks/[id]/events — List all pipeline events for a task.
 * Requires: any authenticated role.
 */

import { NextRequest } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pipelineEvents } from '@/lib/schema';
import { validateApiKey, AuthError } from '@/lib/api-auth';
import {
  createErrorResponse,
  createSuccessResponse,
  extractIdFromParams,
  handleDatabaseError,
} from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await validateApiKey(request);

    const { id } = await params;
    const taskId = extractIdFromParams({ id });

    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.taskId, taskId))
      .orderBy(asc(pipelineEvents.timestamp));

    return createSuccessResponse(events);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return createErrorResponse(error.message, error.status);
    }
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    return handleDatabaseError(error);
  }
}
