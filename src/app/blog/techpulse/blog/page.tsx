import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles, getArticlesCount } from '@/lib/techpulse-data'
import { TechPulseNavbar } from '../_components/navbar'
import { TechPulseFooter } from '../_components/footer'
import { ArticleCard } from '../_components/article-card'
import { JsonLd } from '@/components/json-ld'
import {
  generateBreadcrumbJsonLd,
  generateBlogPageMetadata,
  blogListBreadcrumbs,
} from '@/lib/blog-seo'

export const revalidate = 60

const PER_PAGE = 12

const categories = [
  { label: 'All', tag: '' },
  { label: 'Gaming', tag: 'gaming' },
  { label: 'Hardware', tag: 'hardware' },
  { label: 'AI', tag: 'ai' },
  { label: 'Apple', tag: 'apple' },
  { label: 'Open Source', tag: 'open source' },
]

export const metadata: Metadata = generateBlogPageMetadata('techpulse', {
  title: 'All Posts',
  description: 'Browse all TechPulse Daily articles on AI, gaming, hardware, and more.',
  path: '/blog',
})

interface PageProps {
  searchParams: Promise<{ page?: string; tag?: string }>
}

export default async function BlogListingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const activeTag = params.tag || ''

  const [articles, totalCount] = await Promise.all([
    getPublishedArticles({
      limit: PER_PAGE,
      offset: (currentPage - 1) * PER_PAGE,
      tag: activeTag || undefined,
    }),
    getArticlesCount(activeTag || undefined),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))
  const safeArticles = Array.isArray(articles) ? articles : []

  return (
    <div className="tp-dot-bg min-h-screen">
      <JsonLd data={generateBreadcrumbJsonLd(blogListBreadcrumbs('techpulse'))} />
      <TechPulseNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">All Posts</h1>
        <p className="text-gray-500 mb-8">
          {totalCount} article{totalCount !== 1 ? 's' : ''}
          {activeTag ? ` tagged "${activeTag}"` : ''}
        </p>

        {/* Tag filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => {
            const isActive = activeTag === cat.tag
            return (
              <Link
                key={cat.tag}
                href={
                  cat.tag
                    ? `/blog/techpulse/blog?tag=${encodeURIComponent(cat.tag)}`
                    : '/blog/techpulse/blog'
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-red-500 text-white'
                    : 'text-gray-400 border border-white/10 hover:border-red-500/30 hover:text-white'
                }`}
              >
                {cat.label}
              </Link>
            )
          })}
        </div>

        {/* Articles grid */}
        {safeArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No articles found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {safeArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
            {currentPage > 1 && (
              <Link
                href={`/blog/techpulse/blog?page=${currentPage - 1}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}`}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 border border-white/10 hover:border-red-500/30 hover:text-white transition-colors"
              >
                ← Prev
              </Link>
            )}
            <span className="text-sm text-gray-500 px-4">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/blog/techpulse/blog?page=${currentPage + 1}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}`}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 border border-white/10 hover:border-red-500/30 hover:text-white transition-colors"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </main>

      <TechPulseFooter />
    </div>
  )
}
