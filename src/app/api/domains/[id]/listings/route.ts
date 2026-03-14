import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainListings } from '@/lib/domains-schema';
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
 * GET /api/domains/:id/listings — List all listings for a domain
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

    const listings = await domainsDb
      .select()
      .from(domainListings)
      .where(eq(domainListings.domainId, id))
      .orderBy(desc(domainListings.createdAt));

    return createSuccessResponse(listings);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/domains/:id/listings — Add a listing
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

    if (!body.platform || body.askingPrice == null) {
      return createErrorResponse('platform and askingPrice are required', 400);
    }

    const now = new Date().toISOString();

    const [created] = await domainsDb
      .insert(domainListings)
      .values({
        domainId: id,
        platform: body.platform,
        askingPrice: body.askingPrice,
        minOfferPrice: body.minOfferPrice ?? null,
        listingUrl: body.listingUrl ?? null,
        listingDate: body.listingDate ?? now,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createSuccessResponse(created, 'Listing created', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
