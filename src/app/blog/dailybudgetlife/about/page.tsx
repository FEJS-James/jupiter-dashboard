import Link from 'next/link';
import { generateBlogPageMetadata, generateBreadcrumbJsonLd, aboutBreadcrumbs } from '@/lib/blog-seo';
import { JsonLd } from '@/components/json-ld';
import { Navbar } from '../_components/navbar';
import { FooterCompact } from '../_components/footer';

export const revalidate = 60;

export const metadata = generateBlogPageMetadata('dailybudgetlife', {
  title: 'About',
  description:
    'Learn about DailyBudgetLife — our mission, approach to budgeting, and the team behind the blog.',
  path: '/about',
});

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <>
      <JsonLd data={generateBreadcrumbJsonLd(aboutBreadcrumbs('dailybudgetlife'))} />
      <Navbar activePage="about" />

      {/* Hero */}
      <section
        className="py-16"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #fafaf9 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">About DailyBudgetLife</h1>
          <p className="text-lg text-gray-700">
            Making personal finance accessible, practical, and actually enjoyable.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Mission */}
        <section className="mb-16">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Our Mission</h2>
          <div className="rounded-2xl bg-white p-8 shadow-sm" style={{ borderLeft: '4px solid #059669' }}>
            <p className="text-gray-700 leading-relaxed">
              We believe everyone deserves to feel confident about their money. DailyBudgetLife
              was created to cut through the noise of complex financial advice and deliver
              simple, actionable strategies that real people can use every day.
            </p>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Whether you&apos;re a student managing your first budget, a young professional
              navigating rent and student loans, or anyone looking to save smarter — we&apos;re
              here to help you build a healthier relationship with money.
            </p>
          </div>
        </section>

        {/* Approach */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Our Approach to Budgeting</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                icon: '📊',
                title: 'The 50/30/20 Rule',
                desc: 'We champion the 50/30/20 framework — 50% needs, 30% wants, 20% savings. Simple, flexible, effective.',
              },
              {
                icon: '🎯',
                title: 'Goal-Based Saving',
                desc: 'Every savings plan should start with a clear goal. We help you define yours and build a path to reach it.',
              },
              {
                icon: '📝',
                title: 'No-Jargon Writing',
                desc: 'Finance doesn\'t have to be complicated. We explain everything in plain language anyone can understand.',
              },
              {
                icon: '🔄',
                title: 'Habit Over Hustle',
                desc: 'Sustainable money habits beat get-rich-quick schemes every time. We focus on building routines that stick.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Author */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Meet the Author</h2>
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✍️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">The DailyBudgetLife Team</h3>
              <p className="mt-1 text-sm" style={{ color: '#059669' }}>
                Personal Finance Writers
              </p>
              <p className="mt-3 text-gray-700 leading-relaxed">
                We&apos;re a small team of budget nerds who have collectively saved tens of
                thousands of dollars by following the principles we write about. Our articles
                come from real experience — the wins, the mistakes, and everything in between.
              </p>
              <p className="mt-3 text-gray-700 leading-relaxed">
                From paying off student loans to building emergency funds to finding the best
                deals on groceries — we&apos;ve been there, and we want to share what works.
              </p>
            </div>
          </div>
        </section>

        {/* Topics */}
        <section className="mb-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">What We Write About</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { emoji: '💰', label: 'Budgeting' },
              { emoji: '🏠', label: 'Housing' },
              { emoji: '🍽️', label: 'Food' },
              { emoji: '📱', label: 'Subscriptions' },
              { emoji: '🎓', label: 'Student Life' },
              { emoji: '✈️', label: 'Travel' },
              { emoji: '💳', label: 'Debt' },
            ].map((t) => (
              <Link
                key={t.label}
                href={`/blog/dailybudgetlife/blog?tag=${encodeURIComponent(t.label)}`}
                className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                {t.emoji} {t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl p-10 text-center text-white"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          }}
        >
          <h2 className="mb-3 text-2xl font-bold">Ready to Take Control?</h2>
          <p className="mb-6 text-emerald-100">
            Start exploring our articles and discover practical ways to improve
            your financial life.
          </p>
          <Link
            href="/blog/dailybudgetlife/blog"
            className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold shadow-md transition hover:bg-gray-50"
            style={{ color: '#059669' }}
          >
            Browse Articles →
          </Link>
        </section>
      </div>

      <FooterCompact />
    </>
  );
}
