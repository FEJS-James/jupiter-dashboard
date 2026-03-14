import Link from 'next/link'
import type { Article } from '@/lib/blog-schema'
import { getHeroImage, formatDate } from '@/lib/smarthomemade-data'

interface ArticleCardProps {
  article: Article
  variant?: 'default' | 'hero' | 'compact'
  showExcerpt?: boolean
  number?: string
}

export function ArticleCard({
  article,
  variant = 'default',
  showExcerpt = true,
  number,
}: ArticleCardProps) {
  const tags = Array.isArray(article.tags) ? article.tags : []
  const imageUrl = article.heroImage || getHeroImage(tags)
  const date = formatDate(article.publishDate)

  if (variant === 'compact') {
    return (
      <Link
        href={`/blog/smarthomemade/${article.slug}`}
        className="group flex gap-4 items-start"
      >
        {number && (
          <span className="text-3xl font-bold text-gray-200 group-hover:text-blue-300 transition-colors shrink-0">
            {number}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {article.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{date}</p>
        </div>
      </Link>
    )
  }

  if (variant === 'hero') {
    return (
      <Link
        href={`/blog/smarthomemade/${article.slug}`}
        className="group block relative overflow-hidden rounded-xl"
      >
        <div className="aspect-[16/10] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <span className="shm-featured-badge">Featured</span>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {tags.length > 0 && (
              <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-600/90 text-white mb-3">
                {tags[0]}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors line-clamp-3">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="text-sm text-gray-200 line-clamp-2">{article.excerpt}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-300">
              <span>{article.author}</span>
              <span aria-hidden="true">·</span>
              <span>{date}</span>
              {article.readingTimeMinutes && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.readingTimeMinutes} min read</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Default card
  return (
    <Link href={`/blog/smarthomemade/${article.slug}`} className="group block shm-card">
      <div className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={article.title}
          className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        {tags.length > 0 && (
          <span className="inline-block text-xs font-medium text-blue-600 mb-1.5">
            {tags[0]}
          </span>
        )}
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1.5">
          {article.title}
        </h3>
        {showExcerpt && article.excerpt && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{article.excerpt}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{article.author}</span>
          <span aria-hidden="true">·</span>
          <span>{date}</span>
        </div>
      </div>
    </Link>
  )
}
