import { NextRequest } from 'next/server';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainScores } from '@/lib/domains-schema';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  parseRequestBody,
  isUniqueConstraintError,
} from '@/lib/api-utils';

/**
 * POST /api/domains/propose — Bulk propose domains (Mars endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);

    if (!Array.isArray(body.domains) || body.domains.length === 0) {
      return createErrorResponse('domains array is required and must not be empty', 400);
    }

    const now = new Date().toISOString();
    const created = [];
    const errors = [];

    for (const d of body.domains) {
      if (!d.domainName || !d.tld) {
        errors.push({ domainName: d.domainName, error: 'domainName and tld are required' });
        continue;
      }

      try {
        const [domain] = await domainsDb
          .insert(domains)
          .values({
            domainName: d.domainName,
            tld: d.tld,
            status: 'proposed',
            score: d.score ?? null,
            estimatedValue: d.estimatedValue ?? null,
            registrationCost: d.registrationCost ?? null,
            proposedBy: 'mars',
            proposedDate: now,
            proposedReasoning: d.reasoning ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        // Create initial score entry if score provided
        if (d.score != null && d.scoreBreakdown) {
          await domainsDb.insert(domainScores).values({
            domainId: domain.id,
            score: d.score,
            scoreBreakdown: typeof d.scoreBreakdown === 'string'
              ? d.scoreBreakdown
              : JSON.stringify(d.scoreBreakdown),
            scoredAt: now,
          });
        }

        created.push(domain);
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          errors.push({ domainName: d.domainName, error: 'Domain already exists' });
        } else {
          errors.push({ domainName: d.domainName, error: 'Failed to create' });
        }
      }
    }

    return createSuccessResponse(
      { created, errors },
      `${created.length} domains proposed, ${errors.length} errors`,
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    return handleDatabaseError(error);
  }
}
