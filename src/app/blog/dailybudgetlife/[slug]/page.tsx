import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getArticleBySlug,
  getArticleSlugs,
  getAdjacentArticles,
  getHeroImageForTopic,
} from '@/lib/dailybudgetlife-data';
import { Navbar } from '../_components/navbar';
import { FooterCompact } from '../_components/footer';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  if (!Array.isArray(slugs)) return [];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: 'Article Not Found' };
  return {
    title: article.title,
    description: article.metaDescription ?? article.excerpt ?? '',
  };
}

// ─── TOC extraction ─────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    items.push({ id, text, level });
  }
  return items;
}

// ─── Simple Markdown → HTML ─────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md
    // Headings with IDs
    .replace(/^### (.+)$/gm, (_m, t) => {
      const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<h3 id="${id}">${t}</h3>`;
    })
    .replace(/^## (.+)$/gm, (_m: string, t: string) => {
      const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<h2 id="${id}">${t}</h2>`;
    })
    .replace(/^# (.+)$/gm, (_m: string, t: string) => {
      const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<h1 id="${id}">${t}</h1>`;
    })
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-700 underline">$1</a>')
    // Lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/\n{2,}/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>(\s*<br \/>)*)+/g, (match) => {
    return `<ul class="list-disc pl-6 space-y-1">${match.replace(/<br \/>/g, '')}</ul>`;
  });

  return `<p>${html}</p>`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const { prev, next } = await getAdjacentArticles(slug);
  const toc = article.content ? extractToc(article.content) : [];
  const htmlContent = article.content ? markdownToHtml(article.content) : '';

  return (
    <>
      <Navbar />
      {/* Hero */}
      <div className="relative h-64 overflow-hidden bg-stone-200 md:h-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.heroImage || getHeroImageForTopic(article.tags)}
          alt={article.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Meta */}
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="font-medium text-gray-900">{article.author}</span>
          <span>·</span>
          <span>
            {article.publishDate
              ? new Date(article.publishDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Draft'}
          </span>
          <span>·</span>
          <span>{article.readingTimeMinutes ?? 5} min read</span>
        </div>

        <h1 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">{article.title}</h1>

        {/* Tags */}
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/dailybudgetlife/blog?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium transition hover:bg-emerald-100"
                style={{ color: '#059669' }}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="flex gap-8 lg:flex-row">
          {/* TOC sidebar */}
          {Array.isArray(toc) && toc.length > 0 && (
            <aside className="hidden w-56 flex-shrink-0 lg:block">
              <div className="sticky top-24 rounded-xl bg-white p-5 shadow-sm">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Table of Contents
                </h4>
                <ul className="space-y-2">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block text-sm text-gray-600 transition hover:text-emerald-700"
                        style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          {/* Article body */}
          <article
            className="prose prose-lg prose-stone min-w-0 flex-1 prose-headings:text-gray-900 prose-a:text-emerald-700"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Prev / Next */}
        <div className="mt-16 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/blog/dailybudgetlife/${prev.slug}`}
              className="group rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
              style={{ borderLeft: '4px solid #059669' }}
            >
              <span className="text-xs text-gray-500">← Previous</span>
              <p className="mt-1 text-sm font-bold text-gray-900 transition group-hover:text-emerald-700">
                {prev.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/blog/dailybudgetlife/${next.slug}`}
              className="group rounded-xl bg-white p-5 text-right shadow-sm transition hover:shadow-md"
              style={{ borderRight: '4px solid #059669' }}
            >
              <span className="text-xs text-gray-500">Next →</span>
              <p className="mt-1 text-sm font-bold text-gray-900 transition group-hover:text-emerald-700">
                {next.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>

      <FooterCompact />
    </>
  );
}
