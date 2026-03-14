import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import {
  domains,
  domainListings,
  domainOffers,
  domainTransactions,
  domainScores,
  domainNotes,
} from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
} from '@/lib/api-utils';

function parseId(params: { id: string }): number | null {
  const id = parseInt(params.id, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

/**
 * GET /api/domains/:id — Get single domain with all related data
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId({ id: rawId });
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    const [domain] = await domainsDb
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (!domain) return createErrorResponse('Domain not found', 404);

    const [listings, offers, transactions, scores, notes] = await Promise.all([
      domainsDb.select().from(domainListings).where(eq(domainListings.domainId, id)),
      domainsDb.select().from(domainOffers).where(eq(domainOffers.domainId, id)),
      domainsDb.select().from(domainTransactions).where(eq(domainTransactions.domainId, id)),
      domainsDb.select().from(domainScores).where(eq(domainScores.domainId, id)),
      domainsDb.select().from(domainNotes).where(eq(domainNotes.domainId, id)),
    ]);

    return createSuccessResponse({
      ...domain,
      listings,
      offers,
      transactions,
      scores,
      notes,
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/domains/:id — Update domain fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId({ id: rawId });
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    const body = await parseRequestBody(request);

    // Don't allow updating id or createdAt
    delete body.id;
    delete body.createdAt;

    if (Object.keys(body).length === 0) {
      return createErrorResponse('No fields to update', 400);
    }

    body.updatedAt = new Date().toISOString();

    const [updated] = await domainsDb
      .update(domains)
      .set(body)
      .where(eq(domains.id, id))
      .returning();

    if (!updated) return createErrorResponse('Domain not found', 404);

    return createSuccessResponse(updated, 'Domain updated');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}

/**
 * DELETE /api/domains/:id — Soft-delete (set status to expired)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId({ id: rawId });
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    const [updated] = await domainsDb
      .update(domains)
      .set({ status: 'expired', updatedAt: new Date().toISOString() })
      .where(eq(domains.id, id))
      .returning();

    if (!updated) return createErrorResponse('Domain not found', 404);

    return createSuccessResponse(updated, 'Domain soft-deleted');
  } catch (error) {
    return handleDatabaseError(error);
  }
}
