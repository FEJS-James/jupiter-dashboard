import { NextRequest } from 'next/server';
import { inArray } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains } from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
} from '@/lib/api-utils';

const VALID_STATUSES = ['proposed', 'review', 'purchased', 'listed', 'offer_received', 'sold', 'expired'] as const;

/**
 * PATCH /api/domains/bulk — Bulk status update
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return createErrorResponse('ids array is required and must not be empty', 400);
    }

    if (!body.status) {
      return createErrorResponse('status is required', 400);
    }

    if (!VALID_STATUSES.includes(body.status)) {
      return createErrorResponse(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const ids = body.ids.map((id: unknown) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);

    if (ids.length === 0) {
      return createErrorResponse('No valid IDs provided', 400);
    }

    const updated = await domainsDb
      .update(domains)
      .set({
        status: body.status,
        updatedAt: new Date().toISOString(),
      })
      .where(inArray(domains.id, ids))
      .returning();

    return createSuccessResponse(updated, `${updated.length} domains updated`);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
