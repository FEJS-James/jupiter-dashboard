import { NextRequest } from 'next/server';
import { and, sql, isNotNull, asc, count } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains } from '@/lib/domains-schema';
import {
  createSuccessResponse,
  handleDatabaseError,
} from '@/lib/api-utils';

/**
 * GET /api/domains/renewals/upcoming — Domains with renewal_date within N days
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const days = Math.max(1, parseInt(url.searchParams.get('days') || '30', 10));
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const whereClause = and(
      isNotNull(domains.renewalDate),
      sql`${domains.renewalDate} <= datetime('now', '+' || ${days} || ' days')`,
      sql`${domains.renewalDate} >= datetime('now')`,
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
      .orderBy(asc(domains.renewalDate))
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
