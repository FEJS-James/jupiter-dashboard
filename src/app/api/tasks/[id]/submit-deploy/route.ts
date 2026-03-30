/**
 * POST /api/tasks/[id]/submit-deploy — DevOps submits deploy result.
 * Requires: devops role. Task must be in 'deploying'.
 * success → 'done', failure → 'in-progress'.
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

const submitDeploySchema = z.object({
  result: z.enum(['success', 'failure']),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(request, ['devops', 'admin']);

    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await request.json().catch(() => ({}));
    const parsed = submitDeploySchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse('Validation failed', 400, {
        issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return createErrorResponse('Task not found', 404);

    const fromStatus = task.status;
    const toStatus = parsed.data.result === 'success' ? 'done' : 'in-progress';
    const transition = validateTransition(fromStatus, toStatus, auth.role);
    if (!transition.valid) {
      return createErrorResponse(transition.error ?? 'Invalid transition', 409);
    }

    const [updated] = await db
      .update(tasks)
      .set({ status: toStatus })
      .where(eq(tasks.id, taskId))
      .returning();

    await db.insert(pipelineEvents).values({
      taskId,
      fromStatus,
      toStatus,
      agentRole: auth.role,
      apiKeyId: auth.keyId,
      payload: JSON.stringify(parsed.data),
    });

    const message = parsed.data.result === 'success'
      ? 'Deploy succeeded — task is done'
      : 'Deploy failed — moved back to in-progress';

    return createSuccessResponse(updated, message);
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
