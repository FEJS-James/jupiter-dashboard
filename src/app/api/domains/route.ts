import { NextRequest } from 'next/server';
import { eq, and, like, desc, asc, sql, count } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains } from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
  isUniqueConstraintError,
} from '@/lib/api-utils';

/**
 * GET /api/domains — List domains with filtering, sorting, pagination
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const tld = url.searchParams.get('tld');
    const tier = url.searchParams.get('tier');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(domains.status, status as typeof domains.status.enumValues[number]));
    }
    if (tld) {
      conditions.push(eq(domains.tld, tld));
    }
    if (tier) {
      conditions.push(eq(domains.tier, parseInt(tier, 10)));
    }
    if (search) {
      conditions.push(like(domains.domainName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Map sortBy to column
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortColumnMap: Record<string, any> = {
      created_at: domains.createdAt,
      updated_at: domains.updatedAt,
      domain_name: domains.domainName,
      score: domains.score,
      estimated_value: domains.estimatedValue,
      tier: domains.tier,
    };
    const sortColumn = sortColumnMap[sortBy] || domains.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Count total
    const [countResult] = await domainsDb
      .select({ total: count() })
      .from(domains)
      .where(whereClause);

    const total = countResult?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch page
    const results = await domainsDb
      .select()
      .from(domains)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
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

/**
 * POST /api/domains — Create a domain (manual entry)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);

    if (!body.domainName || !body.tld) {
      return createErrorResponse('domainName and tld are required', 400);
    }

    const now = new Date().toISOString();

    const [created] = await domainsDb
      .insert(domains)
      .values({
        domainName: body.domainName,
        tld: body.tld,
        status: body.status || 'proposed',
        tier: body.tier ?? null,
        score: body.score ?? null,
        estimatedValue: body.estimatedValue ?? null,
        registrationCost: body.registrationCost ?? null,
        registrar: body.registrar ?? null,
        purchaseDate: body.purchaseDate ?? null,
        renewalDate: body.renewalDate ?? null,
        renewalCost: body.renewalCost ?? null,
        dnsProvider: body.dnsProvider ?? null,
        parkingStatus: body.parkingStatus ?? null,
        proposedBy: body.proposedBy ?? null,
        proposedDate: body.proposedDate ?? null,
        proposedReasoning: body.proposedReasoning ?? null,
        notes: body.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createSuccessResponse(created, 'Domain created successfully', 201);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return createErrorResponse('Domain already exists', 409);
    }
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
