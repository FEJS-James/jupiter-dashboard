import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─── Blogs ──────────────────────────────────────────────────────────────────

export const blogs = sqliteTable('blogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  themeConfig: text('theme_config', { mode: 'json' }).$type<Record<string, unknown>>(),
  domain: text('domain'),
  status: text('status', { enum: ['active', 'inactive', 'archived'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Articles ───────────────────────────────────────────────────────────────

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blogId: integer('blog_id')
    .notNull()
    .references(() => blogs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content'), // Full Markdown
  heroImage: text('hero_image'),
  author: text('author').notNull().default('Mars'),
  excerpt: text('excerpt'),
  metaDescription: text('meta_description'),
  status: text('status', { enum: ['draft', 'published', 'deleted'] })
    .notNull()
    .default('draft'),
  publishDate: integer('publish_date', { mode: 'timestamp' }),
  hasAffiliateLinks: integer('has_affiliate_links').notNull().default(0),
  affiliateTag: text('affiliate_tag'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  wordCount: integer('word_count'),
  readingTimeMinutes: integer('reading_time_minutes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  idxArticlesBlogStatus: index('idx_articles_blog_status').on(table.blogId, table.status),
  idxArticlesBlogPublished: index('idx_articles_blog_published').on(table.blogId, table.publishDate),
  idxArticlesSlug: uniqueIndex('idx_articles_slug').on(table.blogId, table.slug),
}));

// ─── Article Performance ────────────────────────────────────────────────────

export const articlePerformance = sqliteTable('article_performance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date string YYYY-MM-DD
  views: integer('views').notNull().default(0),
  uniqueVisitors: integer('unique_visitors').notNull().default(0),
  avgTimeOnPage: real('avg_time_on_page'), // seconds
  bounceRate: real('bounce_rate'),
  ctr: real('ctr'),
});

// ─── Affiliate Links ────────────────────────────────────────────────────────

export const affiliateLinks = sqliteTable('affiliate_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  productName: text('product_name').notNull(),
  affiliateUrl: text('affiliate_url').notNull(),
  clicks: integer('clicks').notNull().default(0),
  conversions: integer('conversions').notNull().default(0),
  revenue: real('revenue').notNull().default(0),
});

// ─── Revenue ────────────────────────────────────────────────────────────────

export const revenue = sqliteTable('revenue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blogId: integer('blog_id')
    .notNull()
    .references(() => blogs.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // ISO date string YYYY-MM-DD
  source: text('source', { enum: ['affiliate', 'ads', 'sponsored'] }).notNull(),
  amount: real('amount').notNull().default(0),
  notes: text('notes'),
});

// ─── Content Pipeline ───────────────────────────────────────────────────────

export const contentPipeline = sqliteTable('content_pipeline', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  blogId: integer('blog_id')
    .notNull()
    .references(() => blogs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status', {
    enum: ['idea', 'outline', 'draft', 'review', 'scheduled', 'published'],
  })
    .notNull()
    .default('idea'),
  targetDate: integer('target_date', { mode: 'timestamp' }),
  keywords: text('keywords', { mode: 'json' }).$type<string[]>(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Optimization Queue ─────────────────────────────────────────────────────

export const optimizationQueue = sqliteTable('optimization_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  optimizationType: text('optimization_type').notNull(),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] })
    .notNull()
    .default('medium'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'skipped'] })
    .notNull()
    .default('pending'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const blogsRelations = relations(blogs, ({ many }) => ({
  articles: many(articles),
  revenue: many(revenue),
  contentPipeline: many(contentPipeline),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  blog: one(blogs, {
    fields: [articles.blogId],
    references: [blogs.id],
  }),
  performance: many(articlePerformance),
  affiliateLinks: many(affiliateLinks),
  optimizationQueue: many(optimizationQueue),
}));

export const articlePerformanceRelations = relations(articlePerformance, ({ one }) => ({
  article: one(articles, {
    fields: [articlePerformance.articleId],
    references: [articles.id],
  }),
}));

export const affiliateLinksRelations = relations(affiliateLinks, ({ one }) => ({
  article: one(articles, {
    fields: [affiliateLinks.articleId],
    references: [articles.id],
  }),
}));

export const revenueRelations = relations(revenue, ({ one }) => ({
  blog: one(blogs, {
    fields: [revenue.blogId],
    references: [blogs.id],
  }),
}));

export const contentPipelineRelations = relations(contentPipeline, ({ one }) => ({
  blog: one(blogs, {
    fields: [contentPipeline.blogId],
    references: [blogs.id],
  }),
}));

export const optimizationQueueRelations = relations(optimizationQueue, ({ one }) => ({
  article: one(articles, {
    fields: [optimizationQueue.articleId],
    references: [articles.id],
  }),
}));

// ─── Type Exports ───────────────────────────────────────────────────────────

export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticlePerformance = typeof articlePerformance.$inferSelect;
export type NewArticlePerformance = typeof articlePerformance.$inferInsert;

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type NewAffiliateLink = typeof affiliateLinks.$inferInsert;

export type Revenue = typeof revenue.$inferSelect;
export type NewRevenue = typeof revenue.$inferInsert;

export type ContentPipelineItem = typeof contentPipeline.$inferSelect;
export type NewContentPipelineItem = typeof contentPipeline.$inferInsert;

export type OptimizationQueueItem = typeof optimizationQueue.$inferSelect;
export type NewOptimizationQueueItem = typeof optimizationQueue.$inferInsert;
