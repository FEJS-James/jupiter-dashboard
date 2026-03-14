import { NextRequest } from 'next/server';
import { eq, sql, count } from 'drizzle-orm';
import { domainsDb } from '@/lib/domains-db';
import { domains, domainTransactions } from '@/lib/domains-schema';
import {
  createSuccessResponse,
  handleDatabaseError,
} from '@/lib/api-utils';

/**
 * GET /api/domains/analytics/summary — Dashboard summary stats
 */
export async function GET(_request: NextRequest) {
  try {
    // Total portfolio value (estimated)
    const [valueResult] = await domainsDb
      .select({
        totalEstimatedValue: sql<number>`COALESCE(SUM(${domains.estimatedValue}), 0)`,
        portfolioSize: count(),
      })
      .from(domains)
      .where(sql`${domains.status} NOT IN ('expired', 'sold')`);

    // Total invested (registration + renewal costs from transactions)
    const [investedResult] = await domainsDb
      .select({
        totalInvested: sql<number>`COALESCE(SUM(${domainTransactions.amount}), 0)`,
      })
      .from(domainTransactions)
      .where(sql`${domainTransactions.type} IN ('registration', 'renewal', 'listing_fee')`);

    // Total revenue from sales
    const [revenueResult] = await domainsDb
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${domainTransactions.amount}), 0)`,
      })
      .from(domainTransactions)
      .where(eq(domainTransactions.type, 'sale'));

    // Sold count for sell-through rate
    const [soldResult] = await domainsDb
      .select({ soldCount: count() })
      .from(domains)
      .where(eq(domains.status, 'sold'));

    // Total ever purchased (purchased + listed + offer_received + sold)
    const [totalPurchasedResult] = await domainsDb
      .select({ totalPurchased: count() })
      .from(domains)
      .where(sql`${domains.status} IN ('purchased', 'listed', 'offer_received', 'sold')`);

    // Average hold time for sold domains (days between purchase and sale)
    const [holdTimeResult] = await domainsDb
      .select({
        avgHoldDays: sql<number>`COALESCE(AVG(JULIANDAY(${domains.saleDate}) - JULIANDAY(${domains.purchaseDate})), 0)`,
      })
      .from(domains)
      .where(sql`${domains.status} = 'sold' AND ${domains.purchaseDate} IS NOT NULL AND ${domains.saleDate} IS NOT NULL`);

    // Monthly burn rate (average monthly spend over last 12 months)
    const [burnResult] = await domainsDb
      .select({
        monthlyBurn: sql<number>`COALESCE(SUM(${domainTransactions.amount}) / 12.0, 0)`,
      })
      .from(domainTransactions)
      .where(sql`${domainTransactions.type} IN ('registration', 'renewal', 'listing_fee') AND ${domainTransactions.date} >= datetime('now', '-12 months')`);

    const totalInvested = investedResult?.totalInvested ?? 0;
    const totalRevenue = revenueResult?.totalRevenue ?? 0;
    const netPnL = totalRevenue - totalInvested;
    const portfolioSize = valueResult?.portfolioSize ?? 0;
    const soldCount = soldResult?.soldCount ?? 0;
    const totalPurchased = totalPurchasedResult?.totalPurchased ?? 0;
    const sellThroughRate = totalPurchased > 0 ? (soldCount / totalPurchased) * 100 : 0;
    const averageROI = totalInvested > 0 ? ((totalRevenue - totalInvested) / totalInvested) * 100 : 0;

    return createSuccessResponse({
      totalPortfolioValue: valueResult?.totalEstimatedValue ?? 0,
      totalInvested,
      totalRevenue,
      netPnL,
      portfolioSize,
      sellThroughRate: Math.round(sellThroughRate * 100) / 100,
      averageHoldDays: Math.round(holdTimeResult?.avgHoldDays ?? 0),
      averageROI: Math.round(averageROI * 100) / 100,
      monthlyBurnRate: Math.round((burnResult?.monthlyBurn ?? 0) * 100) / 100,
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
