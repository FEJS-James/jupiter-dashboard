import Link from 'next/link';
import {
  getPublishedArticles,
  getArticlesCount,
  getAllTags,
  getHeroImageForTopic,
  type DBLArticle,
} from '@/lib/dailybudgetlife-data';

export const revalidate = 60;

export const metadata = {
  title: 'All Articles',
  description: 'Browse all DailyBudgetLife articles — budgeting tips, saving guides, and more.',
};

// ─── Navbar ─────────────────────────────────────────────────────────────────

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
          <Link
            href="/blog/dailybudgetlife/blog"
            className="font-bold transition"
            style={{ color: '#059669' }}
          >
            Articles
          </Link>
          <Link href="/blog/dailybudgetlife/about" className="transition hover:text-gray-900">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

const BORDER_COLORS = ['#059669', '#0d9488', '#06b6d4', '#d97706'];

function ArticleCard({ article, index }: { article: DBLArticle; index: number }) {
  return (
    <Link
      href={`/blog/dailybudgetlife/${article.slug}`}
      className="group block rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
      style={{ borderLeft: `4px solid ${BORDER_COLORS[index % BORDER_COLORS.length]}` }}
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
        {(article.heroImage || (Array.isArray(article.tags) && article.tags.length > 0)) && (
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
  );
}

function TagFilter({
  tags,
  activeTag,
}: {
  tags: string[];
  activeTag: string | null;
}) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      <Link
        href="/blog/dailybudgetlife/blog"
        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
          !activeTag
            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
            : 'border-stone-200 bg-white text-gray-600 hover:border-emerald-300'
        }`}
      >
        All
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog/dailybudgetlife/blog?tag=${encodeURIComponent(tag)}`}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTag === tag
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-stone-200 bg-white text-gray-600 hover:border-emerald-300'
          }`}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  activeTag,
}: {
  page: number;
  totalPages: number;
  activeTag: string | null;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (activeTag) params.set('tag', activeTag);
    const qs = params.toString();
    return `/blog/dailybudgetlife/blog${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-emerald-300"
        >
          ← Previous
        </Link>
      )}
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-emerald-300"
        >
          Next →
        </Link>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

const ARTICLES_PER_PAGE = 10;

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const activeTag = resolvedParams.tag ?? null;
  const page = Math.max(1, parseInt(resolvedParams.page ?? '1', 10) || 1);

  const [tags, { articles: articleList }, total] = await Promise.all([
    getAllTags(),
    getPublishedArticles({
      limit: ARTICLES_PER_PAGE,
      offset: (page - 1) * ARTICLES_PER_PAGE,
      tag: activeTag ?? undefined,
    }),
    getArticlesCount(activeTag ?? undefined),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));
  const safeArticles = Array.isArray(articleList) ? articleList : [];

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Articles</h1>
        <p className="mb-8 text-gray-600">
          Explore our collection of budgeting tips, saving strategies, and
          personal finance guides.
        </p>

        <TagFilter tags={Array.isArray(tags) ? tags : []} activeTag={activeTag} />

        {safeArticles.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No articles found{activeTag ? ` for "${activeTag}"` : ''}. Check back soon!
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {safeArticles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={(page - 1) * ARTICLES_PER_PAGE + i}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} activeTag={activeTag} />
      </div>

      {/* Footer */}
      <footer className="mt-8 py-8" style={{ backgroundColor: '#1c1917', color: '#d6d3d1' }}>
        <div className="mx-auto max-w-5xl px-6 text-center text-sm">
          <Link href="/blog/dailybudgetlife" className="transition hover:text-white">
            Daily<span style={{ color: '#059669' }}>Budget</span>Life
          </Link>
          <p className="mt-2 text-xs text-stone-500">
            © {new Date().getFullYear()} DailyBudgetLife. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
