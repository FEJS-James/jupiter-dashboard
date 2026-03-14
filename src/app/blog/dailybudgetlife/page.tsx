import Link from 'next/link';
import {
  getPublishedArticles,
  getFeaturedArticle,
  getHeroImageForTopic,
  type DBLArticle,
} from '@/lib/dailybudgetlife-data';

export const revalidate = 60;

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b border-stone-200"
      style={{ backgroundColor: '#fafaf9' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/blog/dailybudgetlife" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">
            Daily<span style={{ color: '#059669' }}>Budget</span>Life
          </span>
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/blog/dailybudgetlife" className="transition hover:text-gray-900">
            Home
          </Link>
          <Link href="/blog/dailybudgetlife/blog" className="transition hover:text-gray-900">
            Articles
          </Link>
          <Link href="/blog/dailybudgetlife/about" className="transition hover:text-gray-900">
            About
          </Link>
        </div>
        {/* Mobile menu button */}
        <div className="md:hidden">
          <Link
            href="/blog/dailybudgetlife/blog"
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ backgroundColor: '#059669', color: '#fff' }}
          >
            Articles
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ featured }: { featured: DBLArticle | null }) {
  return (
    <section
      className="relative overflow-hidden py-16 md:py-24"
      style={{
        background: 'linear-gradient(135deg, #059669 0%, #fafaf9 50%, #d97706 100%)',
      }}
    >
      <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2 md:items-center">
        {/* Left: text */}
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-800">
            Personal Finance Blog
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
            Smart Money,{' '}
            <span style={{ color: '#059669' }}>Simple Living</span>
          </h1>
          <p className="mb-8 text-lg text-gray-700">
            Practical budgeting tips, saving strategies, and money guides for
            everyday life. No jargon, no fluff — just real advice that works.
          </p>
          <div className="flex gap-4">
            <Link
              href="/blog/dailybudgetlife/blog"
              className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
              style={{ backgroundColor: '#059669' }}
            >
              Read Articles
            </Link>
            <Link
              href="/blog/dailybudgetlife/about"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              About Us
            </Link>
          </div>
        </div>

        {/* Right: featured article card */}
        {featured && (
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.heroImage || getHeroImageForTopic(featured.tags)}
                alt={featured.title}
                className="h-64 w-full object-cover"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-white px-5 py-3 shadow-lg">
              <p className="text-xs font-medium text-gray-500">Latest Article</p>
              <p className="mt-1 text-sm font-bold text-gray-900 line-clamp-1">
                {featured.title}
              </p>
              <p className="text-xs" style={{ color: '#059669' }}>
                {featured.readingTimeMinutes ?? 5} min read
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const BORDER_COLORS = ['#059669', '#0d9488', '#06b6d4', '#d97706'];

function ArticleFeed({ articleList }: { articleList: DBLArticle[] }) {
  if (!Array.isArray(articleList) || articleList.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        No articles yet — check back soon!
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-8 text-2xl font-bold text-gray-900">Recent Articles</h2>
      <div className="flex flex-col gap-6">
        {articleList.map((article, i) => (
          <Link
            key={article.id}
            href={`/blog/dailybudgetlife/${article.slug}`}
            className="group block rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
            style={{ borderLeft: `4px solid ${BORDER_COLORS[i % BORDER_COLORS.length]}` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-lg font-bold text-gray-900 transition group-hover:text-emerald-700">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="mb-3 text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>{article.author}</span>
                  <span>·</span>
                  <span>
                    {article.publishDate
                      ? new Date(article.publishDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Draft'}
                  </span>
                  <span>·</span>
                  <span>{article.readingTimeMinutes ?? 5} min read</span>
                </div>
                {Array.isArray(article.tags) && article.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium"
                        style={{ color: '#059669' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {(article.heroImage || article.tags.length > 0) && (
                <div className="hidden flex-shrink-0 sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.heroImage || getHeroImageForTopic(article.tags)}
                    alt=""
                    className="h-24 w-32 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/blog/dailybudgetlife/blog"
          className="inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#059669' }}
        >
          View All Articles →
        </Link>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { label: '50/30/20 Rule', value: 'Budgeting', icon: '📊' },
    { label: 'Average Saved', value: '$500+', icon: '💰' },
    { label: 'Article Length', value: '7 Min Reads', icon: '📖' },
  ];
  return (
    <section className="py-16" style={{ backgroundColor: '#059669' }}>
      <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center text-white">
            <span className="text-3xl">{stat.icon}</span>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-emerald-100">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopicsPills() {
  const topics = [
    { emoji: '💰', label: 'Budgeting' },
    { emoji: '🏠', label: 'Housing' },
    { emoji: '🍽️', label: 'Food' },
    { emoji: '📱', label: 'Subscriptions' },
    { emoji: '🎓', label: 'Student Life' },
    { emoji: '✈️', label: 'Travel' },
    { emoji: '💳', label: 'Debt' },
  ];
  return (
    <section className="py-16" style={{ backgroundColor: '#fafaf9' }}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Topics We Cover</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {topics.map((t) => (
            <Link
              key={t.label}
              href={`/blog/dailybudgetlife/blog?tag=${encodeURIComponent(t.label)}`}
              className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              {t.emoji} {t.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section className="py-16" style={{ backgroundColor: '#f5f5f4' }}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              🧑‍💼
            </div>
          </div>
          <blockquote className="mb-4 text-lg italic text-gray-700">
            &ldquo;DailyBudgetLife helped me save over $3,000 in my first year out of college.
            The 50/30/20 breakdown changed how I think about every paycheck.&rdquo;
          </blockquote>
          <p className="text-sm font-semibold text-gray-900">Alex M.</p>
          <p className="text-xs text-gray-500">Recent Graduate &amp; Budget Enthusiast</p>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      className="py-16"
      style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl px-6 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">Start Your Budget Journey Today</h2>
        <p className="mb-8 text-emerald-100">
          Join thousands of readers who are taking control of their finances, one
          article at a time.
        </p>
        <Link
          href="/blog/dailybudgetlife/blog"
          className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold shadow-md transition hover:bg-gray-50"
          style={{ color: '#059669' }}
        >
          Browse Articles →
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12" style={{ backgroundColor: '#1c1917', color: '#d6d3d1' }}>
      <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-bold text-white">
            Daily<span style={{ color: '#059669' }}>Budget</span>Life
          </h3>
          <p className="text-sm text-stone-400">
            Practical personal finance tips for everyday life.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/blog/dailybudgetlife/blog" className="transition hover:text-white">
                Articles
              </Link>
            </li>
            <li>
              <Link href="/blog/dailybudgetlife/about" className="transition hover:text-white">
                About
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-white">Topics</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/blog/dailybudgetlife/blog?tag=Budgeting"
                className="transition hover:text-white"
              >
                💰 Budgeting
              </Link>
            </li>
            <li>
              <Link
                href="/blog/dailybudgetlife/blog?tag=Housing"
                className="transition hover:text-white"
              >
                🏠 Housing
              </Link>
            </li>
            <li>
              <Link
                href="/blog/dailybudgetlife/blog?tag=Food"
                className="transition hover:text-white"
              >
                🍽️ Food
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-5xl border-t border-stone-800 px-6 pt-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} DailyBudgetLife. All rights reserved.
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DailyBudgetLifeHome() {
  const featured = await getFeaturedArticle();
  const { articles: recentArticles } = await getPublishedArticles({ limit: 5 });

  return (
    <>
      <Navbar />
      <HeroSection featured={featured} />
      <ArticleFeed articleList={Array.isArray(recentArticles) ? recentArticles : []} />
      <StatsSection />
      <TopicsPills />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </>
  );
}
