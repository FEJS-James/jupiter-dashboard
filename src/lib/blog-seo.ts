import type { Metadata } from 'next'

// ─── Blog Configurations ────────────────────────────────────────────────────

export interface BlogConfig {
  name: string
  description: string
  domain: string
  language: string
}

export const BLOG_CONFIGS: Record<string, BlogConfig> = {
  techpulse: {
    name: 'TechPulse Daily',
    description:
      'Your daily source for breaking tech news, in-depth analysis, and expert opinions on AI, gaming, hardware, and open source.',
    domain: 'https://techpulsedaily.com',
    language: 'en',
  },
  smarthomemade: {
    name: 'SmartHomeMade',
    description:
      'Your trusted source for smart home device reviews, setup guides, and automation tips.',
    domain: 'https://smarthomemade.com',
    language: 'en',
  },
  dailybudgetlife: {
    name: 'DailyBudgetLife',
    description:
      'Practical personal finance tips, budgeting strategies, and money-saving guides for everyday life.',
    domain: 'https://dailybudgetlife.com',
    language: 'en',
  },
}

// ─── URL Helpers ────────────────────────────────────────────────────────────

/**
 * Returns the full URL for a blog, optionally with a path appended.
 * e.g. blogFullUrl('techpulse') → 'https://techpulsedaily.com'
 * e.g. blogFullUrl('techpulse', '/about') → 'https://techpulsedaily.com/about'
 */
export function blogFullUrl(blogSlug: string, path?: string): string {
  const config = BLOG_CONFIGS[blogSlug]
  const base = config?.domain ?? `https://${blogSlug}.com`
  return path ? `${base}${path}` : base
}

/**
 * Returns the full URL for a specific article.
 * e.g. articleFullUrl('techpulse', 'my-article') → 'https://techpulsedaily.com/my-article'
 */
export function articleFullUrl(blogSlug: string, articleSlug: string): string {
  return blogFullUrl(blogSlug, `/${articleSlug}`)
}

/**
 * Returns a canonical URL for the blog page path.
 */
export function canonicalUrl(blogSlug: string, path?: string): string {
  return blogFullUrl(blogSlug, path)
}

// ─── Metadata Generators ────────────────────────────────────────────────────

interface BlogPageMetadataOptions {
  title?: string
  description?: string
  path?: string
}

/**
 * Generates Next.js Metadata for a blog page (homepage, listing, about, etc.)
 * with Open Graph and Twitter card tags.
 */
export function generateBlogPageMetadata(
  blogSlug: string,
  options: BlogPageMetadataOptions = {},
): Metadata {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) return {}

  const title = options.title || config.name
  const description = options.description || config.description
  const url = canonicalUrl(blogSlug, options.path)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: config.name,
      locale: config.language,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

interface ArticleMetadataOptions {
  title: string
  description?: string
  slug: string
  image?: string | null
  publishDate?: string | null
  author?: string
}

/**
 * Generates Next.js Metadata for an individual article page
 * with Open Graph article type and Twitter card tags.
 */
export function generateArticleMetadata(
  blogSlug: string,
  options: ArticleMetadataOptions,
): Metadata {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) return {}

  const { title, description, slug, image, publishDate, author } = options
  const url = articleFullUrl(blogSlug, slug)

  const metadata: Metadata = {
    title,
    description: description || undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      title,
      description: description || undefined,
      url,
      siteName: config.name,
      locale: config.language,
      ...(publishDate ? { publishedTime: publishDate } : {}),
      ...(author ? { authors: [author] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
    },
  }

  if (image) {
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [{ url: image, alt: title }],
    }
    metadata.twitter = {
      ...metadata.twitter,
      images: [image],
    }
  }

  return metadata
}
