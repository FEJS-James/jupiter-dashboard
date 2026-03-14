import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/smarthomemade-data'
import { blogFullUrl, articleFullUrl } from '@/lib/blog-seo'

const BLOG_SLUG = 'smarthomemade'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles({ limit: 1000 })
  const safeArticles = Array.isArray(articles) ? articles : []

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: blogFullUrl(BLOG_SLUG),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: blogFullUrl(BLOG_SLUG, '/blog'),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: blogFullUrl(BLOG_SLUG, '/about'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  const articlePages: MetadataRoute.Sitemap = safeArticles.map((article) => {
    let lastModified: Date | undefined
    if (article.updatedAt) {
      lastModified =
        article.updatedAt instanceof Date
          ? article.updatedAt
          : typeof article.updatedAt === 'number'
            ? new Date(article.updatedAt * 1000)
            : new Date(article.updatedAt)
    }

    return {
      url: articleFullUrl(BLOG_SLUG, article.slug),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }
  })

  return [...staticPages, ...articlePages]
}
