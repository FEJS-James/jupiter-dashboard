import { NextRequest } from 'next/server';
import { and, sql, isNotNull, desc } from 'drizzle-orm';
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

    const results = await domainsDb
      .select()
      .from(domains)
      .where(
        and(
          isNotNull(domains.renewalDate),
          sql`${domains.renewalDate} <= datetime('now', '+' || ${days} || ' days')`,
          sql`${domains.renewalDate} >= datetime('now')`,
        ),
      )
      .orderBy(desc(domains.renewalDate));

    return createSuccessResponse(results);
  } catch (error) {
    return handleDatabaseError(error);
  }
}
