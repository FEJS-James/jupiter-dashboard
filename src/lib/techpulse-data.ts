import { blogDb } from './blog-db'
import { blogs, articles, type Article } from './blog-schema'
import { eq, and, desc, lt, gt, sql, count } from 'drizzle-orm'

// ─── Hero Images Map ────────────────────────────────────────────────────────

const heroImagesMap: Record<string, string> = {
  ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  ml: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  'artificial intelligence': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  hardware: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  apple: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80',
  'open source': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
  programming: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
}

export function getHeroImage(tags: string[] | null): string {
  if (!Array.isArray(tags) || tags.length === 0) return heroImagesMap.default
  for (const tag of tags) {
    const key = tag.toLowerCase()
    if (heroImagesMap[key]) return heroImagesMap[key]
  }
  return heroImagesMap.default
}

// ─── Get TechPulse Blog ID ─────────────────────────────────────────────────

let cachedBlogId: number | null = null

export async function getTechPulseBlogId(): Promise<number | null> {
  if (cachedBlogId !== null) return cachedBlogId
  const result = await blogDb
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.slug, 'techpulse'))
    .limit(1)
  if (result.length > 0) {
    cachedBlogId = result[0].id
    return cachedBlogId
  }
  return null
}

// ─── Safe Date Helper ───────────────────────────────────────────────────────

export function safeDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value * 1000)
  if (typeof value === 'string') return new Date(value)
  return new Date()
}

export function formatDate(value: unknown): string {
  const d = safeDate(value)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Article Queries ────────────────────────────────────────────────────────

export async function getPublishedArticles(opts: {
  limit?: number
  offset?: number
  tag?: string
}): Promise<Article[]> {
  const blogId = await getTechPulseBlogId()
  if (blogId === null) return []

  const conditions = [
    eq(articles.blogId, blogId),
    eq(articles.status, 'published'),
  ]

  const rows = await blogDb
    .select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.publishDate))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0)

  // Filter by tag in app code since tags is JSON
  if (opts.tag) {
    const tagLower = opts.tag.toLowerCase()
    return rows.filter((a) => {
      if (!Array.isArray(a.tags)) return false
      return a.tags.some((t) => t.toLowerCase() === tagLower)
    })
  }

  return rows
}

export async function getArticlesCount(tag?: string): Promise<number> {
  const blogId = await getTechPulseBlogId()
  if (blogId === null) return 0

  if (tag) {
    // Need to count in-app due to JSON tags
    const all = await getPublishedArticles({ tag, limit: 10000 })
    return all.length
  }

  const result = await blogDb
    .select({ total: count() })
    .from(articles)
    .where(
      and(
        eq(articles.blogId, blogId),
        eq(articles.status, 'published')
      )
    )
  return result[0]?.total ?? 0
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const blogId = await getTechPulseBlogId()
  if (blogId === null) return null

  const rows = await blogDb
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.blogId, blogId),
        eq(articles.slug, slug),
        eq(articles.status, 'published')
      )
    )
    .limit(1)

  return rows[0] ?? null
}

export async function getAdjacentArticles(
  currentPublishDate: Date | null
): Promise<{ prev: Article | null; next: Article | null }> {
  const blogId = await getTechPulseBlogId()
  if (blogId === null || !currentPublishDate) return { prev: null, next: null }

  const [prevRows, nextRows] = await Promise.all([
    blogDb
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.blogId, blogId),
          eq(articles.status, 'published'),
          lt(articles.publishDate, currentPublishDate)
        )
      )
      .orderBy(desc(articles.publishDate))
      .limit(1),
    blogDb
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.blogId, blogId),
          eq(articles.status, 'published'),
          gt(articles.publishDate, currentPublishDate)
        )
      )
      .orderBy(articles.publishDate)
      .limit(1),
  ])

  return {
    prev: prevRows[0] ?? null,
    next: nextRows[0] ?? null,
  }
}
