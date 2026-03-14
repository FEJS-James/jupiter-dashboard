import type { Metadata } from 'next'
import { getPublishedArticles } from '@/lib/techpulse-data'
import { TechPulseNavbar } from './_components/navbar'
import { TechPulseFooter } from './_components/footer'
import { BreakingTicker } from './_components/breaking-ticker'
import { ArticleCard } from './_components/article-card'
import { CtaBanner } from './_components/cta-banner'
import { JsonLd } from '@/components/json-ld'
import {
  generateWebSiteJsonLd,
  generateBreadcrumbJsonLd,
  generateBlogPageMetadata,
  homeBreadcrumbs,
} from '@/lib/blog-seo'

export const revalidate = 60

export const metadata: Metadata = generateBlogPageMetadata('techpulse', {
  title: 'TechPulse Daily — Breaking Tech News & Analysis',
  description:
    'Your daily source for breaking tech news, in-depth analysis, and expert opinions on AI, gaming, hardware, and open source.',
})

export default async function TechPulseHomePage() {
  const allArticles = await getPublishedArticles({ limit: 20 })

  // Guard: if no articles, show empty state
  if (!Array.isArray(allArticles) || allArticles.length === 0) {
    return (
      <div className="tp-dot-bg min-h-screen">
        <TechPulseNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="tp-pulse-dot mb-4 mx-auto block" />
            <h1 className="text-2xl font-bold text-white mb-2">No articles yet</h1>
            <p className="text-gray-500">Check back soon for the latest tech news.</p>
          </div>
        </div>
        <TechPulseFooter />
      </div>
    )
  }

  const tickerArticles = allArticles.slice(0, 6)
  const heroFeatured = allArticles[0]
  const heroSide = allArticles.slice(1, 3)
  const trending = allArticles.slice(0, 5)
  const moreStories = allArticles.slice(5, 14)

  return (
    <div className="tp-dot-bg min-h-screen">
      <JsonLd data={generateWebSiteJsonLd('techpulse')} />
      <JsonLd data={generateBreadcrumbJsonLd(homeBreadcrumbs('techpulse'))} />
      {/* Breaking News Ticker */}
      <BreakingTicker articles={tickerArticles} />

      {/* Navigation */}
      <TechPulseNavbar />

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Featured article — 2/3 */}
            <div className="lg:col-span-2">
              <ArticleCard article={heroFeatured} variant="hero" />
            </div>

            {/* Side articles — 1/3 */}
            <div className="flex flex-col gap-6">
              {heroSide.map((article) => (
                <ArticleCard key={article.id} article={article} variant="default" showExcerpt={false} />
              ))}
            </div>
          </div>
        </section>

        {/* Trending Now */}
        {trending.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="tp-pulse-dot" aria-hidden="true" />
              <h2 className="text-xl font-bold text-white">Trending Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {trending.map((article, i) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="compact"
                  number={String(i + 1).padStart(2, '0')}
                />
              ))}
            </div>
          </section>
        )}

        {/* More Stories */}
        {moreStories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-xl font-bold text-white mb-6">More Stories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {moreStories.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <CtaBanner />
      </main>

      <TechPulseFooter />
    </div>
  )
}
