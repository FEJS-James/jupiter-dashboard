import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─── Domains ─────────────────────────────────────────────────────────────────

export const domains = sqliteTable('domains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainName: text('domain_name').notNull().unique(),
  tld: text('tld').notNull(),
  status: text('status', {
    enum: ['proposed', 'review', 'purchased', 'listed', 'offer_received', 'sold', 'expired'],
  })
    .notNull()
    .default('proposed'),
  tier: integer('tier'),
  score: real('score'),
  estimatedValue: real('estimated_value'),
  registrationCost: real('registration_cost'),
  registrar: text('registrar'),
  purchaseDate: text('purchase_date'),
  renewalDate: text('renewal_date'),
  renewalCost: real('renewal_cost'),
  dnsProvider: text('dns_provider'),
  parkingStatus: text('parking_status', {
    enum: ['active', 'none', 'custom_site'],
  }),
  proposedBy: text('proposed_by').default('mars'),
  proposedDate: text('proposed_date'),
  proposedReasoning: text('proposed_reasoning'),
  approvedBy: text('approved_by'),
  approvedDate: text('approved_date'),
  salePrice: real('sale_price'),
  saleDate: text('sale_date'),
  salePlatform: text('sale_platform'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainNameIdx: index('domains_domain_name_idx').on(table.domainName),
  statusIdx: index('domains_status_idx').on(table.status),
  tldIdx: index('domains_tld_idx').on(table.tld),
  tierIdx: index('domains_tier_idx').on(table.tier),
  renewalDateIdx: index('domains_renewal_date_idx').on(table.renewalDate),
  proposedDateIdx: index('domains_proposed_date_idx').on(table.proposedDate),
}));

// ─── Domain Listings ─────────────────────────────────────────────────────────

export const domainListings = sqliteTable('domain_listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  platform: text('platform', {
    enum: ['sedo', 'dan', 'afternic', 'godaddy', 'flippa'],
  }).notNull(),
  listingUrl: text('listing_url'),
  askingPrice: real('asking_price'),
  minOfferPrice: real('min_offer_price'),
  listingDate: text('listing_date'),
  status: text('status', {
    enum: ['active', 'expired', 'sold', 'removed'],
  })
    .notNull()
    .default('active'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainIdIdx: index('domain_listings_domain_id_idx').on(table.domainId),
  platformIdx: index('domain_listings_platform_idx').on(table.platform),
  statusIdx: index('domain_listings_status_idx').on(table.status),
}));

// ─── Domain Offers ───────────────────────────────────────────────────────────

export const domainOffers = sqliteTable('domain_offers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  platform: text('platform'),
  offerAmount: real('offer_amount').notNull(),
  buyerName: text('buyer_name'),
  buyerEmail: text('buyer_email'),
  counterOffer: real('counter_offer'),
  offerDate: text('offer_date').notNull(),
  status: text('status', {
    enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'],
  })
    .notNull()
    .default('pending'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainIdIdx: index('domain_offers_domain_id_idx').on(table.domainId),
  statusIdx: index('domain_offers_status_idx').on(table.status),
}));

// ─── Domain Transactions ─────────────────────────────────────────────────────

export const domainTransactions = sqliteTable('domain_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['registration', 'renewal', 'listing_fee', 'sale', 'commission', 'refund'],
  }).notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  date: text('date').notNull(),
  platform: text('platform'),
  notes: text('notes'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainIdIdx: index('domain_transactions_domain_id_idx').on(table.domainId),
  typeIdx: index('domain_transactions_type_idx').on(table.type),
  dateIdx: index('domain_transactions_date_idx').on(table.date),
}));

// ─── Domain Scores ───────────────────────────────────────────────────────────

export const domainScores = sqliteTable('domain_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),
  scoreBreakdown: text('score_breakdown').notNull(), // JSON with 9 factor scores
  scoredAt: text('scored_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainIdIdx: index('domain_scores_domain_id_idx').on(table.domainId),
}));

// ─── Domain Notes ────────────────────────────────────────────────────────────

export const domainNotes = sqliteTable('domain_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domainId: integer('domain_id')
    .notNull()
    .references(() => domains.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  author: text('author').notNull().default('mars'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  domainIdIdx: index('domain_notes_domain_id_idx').on(table.domainId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const domainsRelations = relations(domains, ({ many }) => ({
  listings: many(domainListings),
  offers: many(domainOffers),
  transactions: many(domainTransactions),
  scores: many(domainScores),
  notes: many(domainNotes),
}));

export const domainListingsRelations = relations(domainListings, ({ one }) => ({
  domain: one(domains, {
    fields: [domainListings.domainId],
    references: [domains.id],
  }),
}));

export const domainOffersRelations = relations(domainOffers, ({ one }) => ({
  domain: one(domains, {
    fields: [domainOffers.domainId],
    references: [domains.id],
  }),
}));

export const domainTransactionsRelations = relations(domainTransactions, ({ one }) => ({
  domain: one(domains, {
    fields: [domainTransactions.domainId],
    references: [domains.id],
  }),
}));

export const domainScoresRelations = relations(domainScores, ({ one }) => ({
  domain: one(domains, {
    fields: [domainScores.domainId],
    references: [domains.id],
  }),
}));

export const domainNotesRelations = relations(domainNotes, ({ one }) => ({
  domain: one(domains, {
    fields: [domainNotes.domainId],
    references: [domains.id],
  }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;

export type DomainListing = typeof domainListings.$inferSelect;
export type NewDomainListing = typeof domainListings.$inferInsert;

export type DomainOffer = typeof domainOffers.$inferSelect;
export type NewDomainOffer = typeof domainOffers.$inferInsert;

export type DomainTransaction = typeof domainTransactions.$inferSelect;
export type NewDomainTransaction = typeof domainTransactions.$inferInsert;

export type DomainScore = typeof domainScores.$inferSelect;
export type NewDomainScore = typeof domainScores.$inferInsert;

export type DomainNote = typeof domainNotes.$inferSelect;
export type NewDomainNote = typeof domainNotes.$inferInsert;
