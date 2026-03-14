import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles, getArticlesCount } from '@/lib/smarthomemade-data'
import { SmartHomeMadeNavbar } from '../_components/navbar'
import { SmartHomeMadeFooter } from '../_components/footer'
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
  { label: 'Smart Plugs', tag: 'smart plugs' },
  { label: 'Lighting', tag: 'lighting' },
  { label: 'Security', tag: 'security' },
  { label: 'Cameras', tag: 'cameras' },
  { label: 'Climate', tag: 'climate' },
  { label: 'Audio', tag: 'audio' },
]

export const metadata: Metadata = generateBlogPageMetadata('smarthomemade', {
  title: 'All Reviews',
  description: 'Browse all SmartHomeMade reviews — smart plugs, lighting, security, cameras, climate, and audio.',
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
    <div className="min-h-screen bg-white">
      <JsonLd data={generateBreadcrumbJsonLd(blogListBreadcrumbs('smarthomemade'))} />
      <SmartHomeMadeNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Reviews</h1>
        <p className="text-gray-500 mb-8">
          {totalCount} review{totalCount !== 1 ? 's' : ''}
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
                    ? `/blog/smarthomemade/blog?tag=${encodeURIComponent(cat.tag)}`
                    : '/blog/smarthomemade/blog'
                }
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
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
            <p className="text-gray-500">No reviews found.</p>
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
                href={`/blog/smarthomemade/blog?page=${currentPage - 1}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}`}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                ← Prev
              </Link>
            )}
            <span className="text-sm text-gray-500 px-4">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/blog/smarthomemade/blog?page=${currentPage + 1}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''}`}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </main>

      <SmartHomeMadeFooter />
    </div>
  )
}
