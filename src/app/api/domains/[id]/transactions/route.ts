import { NextRequest } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainTransactions } from '@/lib/domains-schema';
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
 * GET /api/domains/:id/transactions — List all transactions for a domain
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

    const transactions = await domainsDb
      .select()
      .from(domainTransactions)
      .where(eq(domainTransactions.domainId, id))
      .orderBy(desc(domainTransactions.date));

    return createSuccessResponse(transactions);
  } catch (error) {
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/domains/:id/transactions — Log a transaction
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

    if (!body.type || body.amount == null || !body.date) {
      return createErrorResponse('type, amount, and date are required', 400);
    }

    const validTypes = ['registration', 'renewal', 'listing_fee', 'sale', 'commission', 'refund'];
    if (!validTypes.includes(body.type)) {
      return createErrorResponse(`type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const [created] = await domainsDb
      .insert(domainTransactions)
      .values({
        domainId: id,
        type: body.type,
        amount: body.amount,
        currency: body.currency || 'USD',
        date: body.date,
        platform: body.platform ?? null,
        notes: body.notes ?? null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return createSuccessResponse(created, 'Transaction logged', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
