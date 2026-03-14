import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getArticleBySlug,
  getAdjacentArticles,
  getHeroImage,
  formatDate,
  safeDate,
} from '@/lib/techpulse-data'
import {
  generateArticleMetadata,
  generateArticleJsonLd,
  generateBreadcrumbJsonLd,
  articleBreadcrumbs,
} from '@/lib/blog-seo'
import { JsonLd } from '@/components/json-ld'
import { TechPulseNavbar } from '../_components/navbar'
import { TechPulseFooter } from '../_components/footer'
import { ArticleContent } from './_components/article-content'
import { TableOfContents } from './_components/table-of-contents'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return { title: 'Article Not Found' }

  const publishDate = article.publishDate ? safeDate(article.publishDate).toISOString() : null

  return generateArticleMetadata('techpulse', {
    title: article.title,
    description: article.metaDescription || article.excerpt || null,
    slug,
    image: article.heroImage || getHeroImage(Array.isArray(article.tags) ? article.tags : []),
    publishDate,
    author: article.author,
  })
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const tags = Array.isArray(article.tags) ? article.tags : []
  const imageUrl = article.heroImage || getHeroImage(tags)
  const date = formatDate(article.publishDate)
  const publishDate = safeDate(article.publishDate)
  const { prev, next } = await getAdjacentArticles(publishDate)

  return (
    <div className="tp-dot-bg min-h-screen">
      <JsonLd data={generateArticleJsonLd('techpulse', {
        title: article.title,
        description: article.metaDescription || article.excerpt || null,
        slug,
        image: imageUrl,
        publishDate: publishDate.toISOString(),
        author: article.author,
      })} />
      <JsonLd data={generateBreadcrumbJsonLd(articleBreadcrumbs('techpulse', article.title, slug))} />
      <TechPulseNavbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero image */}
        <div className="overflow-hidden rounded-xl mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full aspect-[2/1] object-cover"
            loading="eager"
          />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/techpulse/blog?tag=${encodeURIComponent(tag.toLowerCase())}`}
                className="rounded-full px-3 py-1 text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-8 pb-8 border-b border-white/5">
          <span className="font-medium text-gray-300">{article.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={publishDate.toISOString()}>{date}</time>
          {article.readingTimeMinutes && (
            <>
              <span aria-hidden="true">·</span>
              <span>{article.readingTimeMinutes} min read</span>
            </>
          )}
        </div>

        {/* Content + TOC layout */}
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-8">
          <article>
            <ArticleContent content={article.content || ''} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents content={article.content || ''} />
            </div>
          </aside>
        </div>

        {/* Previous / Next navigation */}
        <nav className="mt-16 pt-8 border-t border-white/5" aria-label="Article navigation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/blog/techpulse/${prev.slug}`}
                className="group rounded-lg border border-white/5 p-4 hover:border-red-500/20 transition-colors"
              >
                <span className="text-xs text-gray-600 mb-1 block">← Previous</span>
                <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next && (
              <Link
                href={`/blog/techpulse/${next.slug}`}
                className="group rounded-lg border border-white/5 p-4 hover:border-red-500/20 transition-colors text-right"
              >
                <span className="text-xs text-gray-600 mb-1 block">Next →</span>
                <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2">
                  {next.title}
                </span>
              </Link>
            )}
          </div>
        </nav>
      </main>

      <TechPulseFooter />
    </div>
  )
}
