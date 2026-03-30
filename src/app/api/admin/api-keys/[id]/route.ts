/**
 * DELETE /api/admin/api-keys/[id] — Soft-delete (deactivate) an API key.
 * Requires: admin role.
 */

import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { requireRole, AuthError } from '@/lib/api-auth';
import {
  createErrorResponse,
  createSuccessResponse,
  extractIdFromParams,
  handleDatabaseError,
} from '@/lib/api-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ['admin']);

    const { id } = await params;
    const keyId = extractIdFromParams({ id });

    const [existing] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (!existing) {
      return createErrorResponse('API key not found', 404);
    }

    await db
      .update(apiKeys)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, keyId));

    return createSuccessResponse(null, 'API key deactivated');
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return createErrorResponse(error.message, error.status);
    }
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid API key ID', 400);
    }
    return handleDatabaseError(error);
  }
}
