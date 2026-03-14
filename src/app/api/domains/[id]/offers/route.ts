import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainOffers } from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
} from '@/lib/api-utils';

function parseId(id: string): number | null {
  const n = parseInt(id, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

async function domainExists(id: number): Promise<boolean> {
  const [d] = await domainsDb.select({ id: domains.id }).from(domains).where(eq(domains.id, id)).limit(1);
  return !!d;
}

/**
 * GET /api/domains/:id/offers — List all offers for a domain
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    if (!(await domainExists(id))) return createErrorResponse('Domain not found', 404);

    const offers = await domainsDb
      .select()
      .from(domainOffers)
      .where(eq(domainOffers.domainId, id))
      .orderBy(desc(domainOffers.createdAt));

    return createSuccessResponse(offers);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/domains/:id/offers — Log an offer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    if (!(await domainExists(id))) return createErrorResponse('Domain not found', 404);

    const body = await parseRequestBody(request);

    if (body.offerAmount == null || !body.offerDate) {
      return createErrorResponse('offerAmount and offerDate are required', 400);
    }

    const now = new Date().toISOString();

    const [created] = await domainsDb
      .insert(domainOffers)
      .values({
        domainId: id,
        platform: body.platform ?? null,
        offerAmount: body.offerAmount,
        buyerName: body.buyerName ?? null,
        buyerEmail: body.buyerEmail ?? null,
        offerDate: body.offerDate,
        status: 'pending',
        notes: body.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createSuccessResponse(created, 'Offer logged', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/domains/:id/offers — Update offer status
 * Body: { offerId, status, counterOffer? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (!id) return createErrorResponse('Invalid domain ID', 400);

    const body = await parseRequestBody(request);

    if (!body.offerId || !body.status) {
      return createErrorResponse('offerId and status are required', 400);
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'countered', 'expired'];
    if (!validStatuses.includes(body.status)) {
      return createErrorResponse(`status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const updateData: Record<string, unknown> = {
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    if (body.counterOffer != null) {
      updateData.counterOffer = body.counterOffer;
    }

    const [updated] = await domainsDb
      .update(domainOffers)
      .set(updateData)
      .where(
        and(
          eq(domainOffers.id, body.offerId),
          eq(domainOffers.domainId, id),
        ),
      )
      .returning();

    if (!updated) return createErrorResponse('Offer not found', 404);

    return createSuccessResponse(updated, 'Offer updated');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
