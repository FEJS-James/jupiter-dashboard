import { BLOG_CONFIGS, blogFullUrl, articleFullUrl } from '@/lib/blog-seo'

// ─── JsonLd Component ───────────────────────────────────────────────────────

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

/**
 * Renders a <script type="application/ld+json"> tag with structured data.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ─── Schema Generators ──────────────────────────────────────────────────────

/**
 * Generates a WebSite schema for a blog.
 */
export function generateWebSiteSchema(blogSlug: string) {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    description: config.description,
    url: blogFullUrl(blogSlug),
    inLanguage: config.language,
  }
}

interface ArticleSchemaOptions {
  title: string
  description?: string | null
  slug: string
  image?: string | null
  publishDate?: string | null
  modifiedDate?: string | null
  author?: string
}

/**
 * Generates an Article schema for structured data.
 */
export function generateArticleSchema(
  blogSlug: string,
  options: ArticleSchemaOptions,
) {
  const config = BLOG_CONFIGS[blogSlug]
  if (!config) return null

  const { title, description, slug, image, publishDate, modifiedDate, author } =
    options

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(description ? { description } : {}),
    url: articleFullUrl(blogSlug, slug),
    ...(image ? { image } : {}),
    ...(publishDate ? { datePublished: publishDate } : {}),
    ...(modifiedDate ? { dateModified: modifiedDate } : {}),
    ...(author
      ? {
          author: {
            '@type': 'Person',
            name: author,
          },
        }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: config.name,
      url: blogFullUrl(blogSlug),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleFullUrl(blogSlug, slug),
    },
  }
}

interface BreadcrumbItem {
  name: string
  url?: string
}

/**
 * Generates a BreadcrumbList schema.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}
