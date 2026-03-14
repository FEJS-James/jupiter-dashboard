/**
 * Blog SEO Utilities
 *
 * Shared helpers for generating JSON-LD structured data and SEO metadata
 * across all three blogs (TechPulse, SmartHomeMade, DailyBudgetLife).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlogSeoConfig {
  name: string
  slug: string
  description: string
  language: string
}

export interface ArticleSeoData {
  title: string
  slug: string
  excerpt: string | null
  metaDescription: string | null
  heroImage: string | null
  author: string
  publishDate: string | Date | null
  updatedAt: string | Date | null
  tags: string[]
  readingTimeMinutes: number | null
  wordCount: number | null
}

export interface BreadcrumbItem {
  name: string
  url: string
}

// ─── Blog Configurations ────────────────────────────────────────────────────

export const BLOG_CONFIGS: Record<string, BlogSeoConfig> = {
  techpulse: {
    name: 'TechPulse Daily',
    slug: 'techpulse',
    description:
      'Your daily source for breaking tech news, in-depth analysis, and expert opinions on AI, gaming, hardware, and open source.',
    language: 'en',
  },
  smarthomemade: {
    name: 'SmartHomeMade',
    slug: 'smarthomemade',
    description:
      'Your trusted source for smart home device reviews, setup guides, and automation tips.',
    language: 'en',
  },
  dailybudgetlife: {
    name: 'DailyBudgetLife',
    slug: 'dailybudgetlife',
    description:
      'Practical personal finance tips, budgeting strategies, and money-saving guides for everyday life.',
    language: 'en',
  },
}

// ─── URL Helpers ────────────────────────────────────────────────────────────

/**
 * Build a blog base path. Returns relative path like `/blog/techpulse`.
 * When custom domains are active, the middleware will handle rewriting.
 */
export function blogBasePath(blogSlug: string): string {
  return `/blog/${blogSlug}`
}

export function articleUrl(blogSlug: string, articleSlug: string): string {
  return `${blogBasePath(blogSlug)}/${articleSlug}`
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

function toISOString(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  // If it's already an ISO string, return it
  if (typeof value === 'string' && value.includes('T')) return value
  // If it's a numeric-like string (unix timestamp in seconds)
  const num = Number(value)
  if (!isNaN(num)) return new Date(num * 1000).toISOString()
  return new Date(value).toISOString()
}

// ─── JSON-LD: WebSite Schema ────────────────────────────────────────────────

export function generateWebSiteJsonLd(blogSlug: string): Record<string, unknown> {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) throw new Error(`Unknown blog: ${blogSlug}`)

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: blogBasePath(blogSlug),
    description: config.description,
    inLanguage: config.language,
    publisher: {
      '@type': 'Organization',
      name: config.name,
    },
  }
}

// ─── JSON-LD: Article Schema ────────────────────────────────────────────────

export function generateArticleJsonLd(
  blogSlug: string,
  article: ArticleSeoData,
): Record<string, unknown> {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) throw new Error(`Unknown blog: ${blogSlug}`)

  const url = articleUrl(blogSlug, article.slug)
  const datePublished = toISOString(article.publishDate as string | Date | null)
  const dateModified = toISOString(article.updatedAt as string | Date | null)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription || article.excerpt || '',
    image: article.heroImage || undefined,
    url,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: config.name,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(article.wordCount ? { wordCount: article.wordCount } : {}),
    ...(article.tags.length > 0 ? { keywords: article.tags.join(', ') } : {}),
  }
}

// ─── JSON-LD: BreadcrumbList Schema ─────────────────────────────────────────

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ─── Breadcrumb Builders ────────────────────────────────────────────────────

export function homeBreadcrumbs(blogSlug: string): BreadcrumbItem[] {
  const config = BLOG_CONFIGS[blogSlug]
  return [{ name: config?.name || blogSlug, url: blogBasePath(blogSlug) }]
}

export function blogListBreadcrumbs(blogSlug: string): BreadcrumbItem[] {
  const config = BLOG_CONFIGS[blogSlug]
  return [
    { name: config?.name || blogSlug, url: blogBasePath(blogSlug) },
    { name: 'All Posts', url: `${blogBasePath(blogSlug)}/blog` },
  ]
}

export function articleBreadcrumbs(
  blogSlug: string,
  articleTitle: string,
  articleSlugValue: string,
): BreadcrumbItem[] {
  const config = BLOG_CONFIGS[blogSlug]
  return [
    { name: config?.name || blogSlug, url: blogBasePath(blogSlug) },
    { name: 'All Posts', url: `${blogBasePath(blogSlug)}/blog` },
    { name: articleTitle, url: articleUrl(blogSlug, articleSlugValue) },
  ]
}

export function aboutBreadcrumbs(blogSlug: string): BreadcrumbItem[] {
  const config = BLOG_CONFIGS[blogSlug]
  return [
    { name: config?.name || blogSlug, url: blogBasePath(blogSlug) },
    { name: 'About', url: `${blogBasePath(blogSlug)}/about` },
  ]
}

// ─── JSON-LD Script Component Helper ────────────────────────────────────────

/**
 * Returns a JSON string suitable for use in a <script type="application/ld+json"> tag.
 * Accepts one or more JSON-LD objects.
 */
export function jsonLdScriptContent(
  ...schemas: Record<string, unknown>[]
): string {
  if (schemas.length === 1) return JSON.stringify(schemas[0])
  return JSON.stringify(schemas)
}
