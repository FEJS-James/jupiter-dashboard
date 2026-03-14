import { NextRequest } from 'next/server';
import { or, eq, desc } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains } from '@/lib/domains-schema';
import {
  createSuccessResponse,
  handleDatabaseError,
} from '@/lib/api-utils';

/**
 * GET /api/domains/pending-review — Domains with status proposed or review
 */
export async function GET(_request: NextRequest) {
  try {
    const results = await domainsDb
      .select()
      .from(domains)
      .where(
        or(
          eq(domains.status, 'proposed'),
          eq(domains.status, 'review'),
        ),
      )
      .orderBy(desc(domains.createdAt));

    return createSuccessResponse(results);
  } catch (error) {
    return handleDatabaseError(error);
  }
}
