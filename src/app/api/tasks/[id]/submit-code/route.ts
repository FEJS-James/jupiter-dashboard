/**
 * POST /api/tasks/[id]/submit-code — Coder submits code for review.
 * Requires: coder role. Task must be in 'in-progress'.
 * Moves task to 'code-review'.
 */

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { tasks, pipelineEvents } from '@/lib/schema';
import { requireRole, AuthError } from '@/lib/api-auth';
import { validateTransition } from '@/lib/state-machine';
import {
  createErrorResponse,
  createSuccessResponse,
  extractIdFromParams,
  handleDatabaseError,
} from '@/lib/api-utils';

const submitCodeSchema = z.object({
  commitHash: z.string().optional(),
  branch: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Auth
    const auth = await requireRole(request, ['coder', 'admin']);

    // Parse params & body
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await request.json().catch(() => ({}));
    const parsed = submitCodeSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('Validation failed', 400, {
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    // Fetch task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return createErrorResponse('Task not found', 404);

    // State machine
    const fromStatus = task.status;
    const toStatus = 'code-review' as const;
    const transition = validateTransition(fromStatus, toStatus, auth.role);
    if (!transition.valid) {
      return createErrorResponse(transition.error ?? 'Invalid transition', 409);
    }

    // Update task
    const [updated] = await db
      .update(tasks)
      .set({ status: toStatus })
      .where(eq(tasks.id, taskId))
      .returning();

    // Log pipeline event
    await db.insert(pipelineEvents).values({
      taskId,
      fromStatus,
      toStatus,
      agentRole: auth.role,
      apiKeyId: auth.keyId,
      payload: JSON.stringify(parsed.data),
    });

    return createSuccessResponse(updated, 'Code submitted for review');
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
