import { NextRequest } from 'next/server';
import { or, eq, desc, count } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains } from '@/lib/domains-schema';
import {
  createSuccessResponse,
  handleDatabaseError,
} from '@/lib/api-utils';

/**
 * GET /api/domains/pending-review — Domains with status proposed or review
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const whereClause = or(
      eq(domains.status, 'proposed'),
      eq(domains.status, 'review'),
    );

    const [countResult] = await domainsDb
      .select({ total: count() })
      .from(domains)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const results = await domainsDb
      .select()
      .from(domains)
      .where(whereClause)
      .orderBy(desc(domains.createdAt))
      .limit(limit)
      .offset(offset);

    return createSuccessResponse({
      data: results,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
