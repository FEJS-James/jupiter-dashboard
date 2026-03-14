import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedArticles } from '@/lib/smarthomemade-data'
import { SmartHomeMadeNavbar } from './_components/navbar'
import { SmartHomeMadeFooter } from './_components/footer'
import { ArticleCard } from './_components/article-card'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'SmartHomeMade — Smart Home Reviews & Guides',
  description:
    'Your trusted source for smart home device reviews, setup guides, and automation tips.',
}

const stats = [
  { value: '50+', label: 'Device Reviews' },
  { value: '12', label: 'Categories' },
  { value: '25K+', label: 'Monthly Readers' },
  { value: 'Weekly', label: 'New Content' },
]

const categoryCards = [
  { emoji: '🔌', label: 'Smart Plugs', tag: 'smart plugs' },
  { emoji: '💡', label: 'Lighting', tag: 'lighting' },
  { emoji: '🔒', label: 'Security', tag: 'security' },
  { emoji: '📷', label: 'Cameras', tag: 'cameras' },
  { emoji: '🌡️', label: 'Climate', tag: 'climate' },
  { emoji: '🎵', label: 'Audio', tag: 'audio' },
]

const whyReasons = [
  'Honest, unbiased reviews — we buy every device we test',
  'Real-world testing in actual smart homes',
  'Compatibility guides for every major ecosystem',
  'Step-by-step setup tutorials for beginners',
  'Long-term reliability reports after months of use',
  'Budget picks alongside premium recommendations',
]

export default async function SmartHomeMadeHomePage() {
  const allArticles = await getPublishedArticles({ limit: 20 })

  if (!Array.isArray(allArticles) || allArticles.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <SmartHomeMadeNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No articles yet</h1>
            <p className="text-gray-500">Check back soon for the latest smart home reviews.</p>
          </div>
        </div>
        <SmartHomeMadeFooter />
      </div>
    )
  }

  const featuredArticle = allArticles[0]
  const gridArticles = allArticles.slice(1, 7)

  return (
    <div className="min-h-screen bg-white">
      <SmartHomeMadeNavbar />

      <main>
        {/* Hero Section */}
        <section className="shm-hero-bg py-16 sm:py-24">
          {/* Decorative blurs */}
          <div
            className="shm-hero-blur"
            style={{ width: 400, height: 400, top: -100, left: -100, backgroundColor: '#2563eb' }}
            aria-hidden="true"
          />
          <div
            className="shm-hero-blur"
            style={{ width: 300, height: 300, bottom: -80, right: -60, backgroundColor: '#7c3aed' }}
            aria-hidden="true"
          />
          <div
            className="shm-hero-blur"
            style={{ width: 250, height: 250, top: '40%', right: '30%', backgroundColor: '#06b6d4' }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Text */}
              <div>
                <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 mb-4">
                  Smart Home Experts
                </span>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  Make Your Home{' '}
                  <span style={{ color: '#2563eb' }}>Smarter</span>
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-lg">
                  Honest device reviews, in-depth setup guides, and automation tips
                  to help you build the perfect smart home.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/blog/smarthomemade/blog"
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    Browse Reviews
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    href="/blog/smarthomemade/about"
                    className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-300 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    About Us
                  </Link>
                </div>
              </div>

              {/* Featured article image */}
              <div className="relative">
                <ArticleCard article={featuredArticle} variant="hero" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="shm-stats-bar py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Article Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gray-200" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Featured Review
            </h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <ArticleCard article={featuredArticle} variant="hero" />
        </section>

        {/* Article Grid */}
        {gridArticles.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Latest Reviews</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* Category Grid */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryCards.map((cat) => (
              <Link
                key={cat.tag}
                href={`/blog/smarthomemade/blog?tag=${encodeURIComponent(cat.tag)}`}
                className="shm-category-card"
              >
                <span className="text-3xl mb-2 block">{cat.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="shm-newsletter-bg rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Stay in the Loop
            </h2>
            <p className="text-blue-100 mb-6 max-w-lg mx-auto">
              Get weekly smart home tips, new reviews, and exclusive deals delivered straight
              to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Email address"
              />
              <button
                type="button"
                className="rounded-lg px-6 py-3 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-colors"
              >
                Subscribe
              </button>
            </div>
            <p className="text-xs text-blue-200 mt-3">
              No spam, ever. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* Why SmartHomeMade */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Why SmartHomeMade?
            </h2>
            <p className="text-gray-600">
              We&apos;re not just another tech blog. Here&apos;s what sets us apart.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-4">
              {whyReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3">
                  <span
                    className="shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-white text-xs"
                    style={{ backgroundColor: '#2563eb' }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SmartHomeMadeFooter />
    </div>
  )
}
