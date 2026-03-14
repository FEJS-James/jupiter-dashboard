import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { blogDb } from './blog-db';
import { blogs, articles } from './blog-schema';
import { parseJsonField, toISO } from './api-utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DBLArticle {
  id: number;
  blogId: number;
  title: string;
  slug: string;
  content: string | null;
  heroImage: string | null;
  author: string;
  excerpt: string | null;
  metaDescription: string | null;
  status: string;
  publishDate: string | null;
  tags: string[];
  wordCount: number | null;
  readingTimeMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DBLBlog {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOG_SLUG = 'dailybudgetlife';

// ─── Serializers ────────────────────────────────────────────────────────────

function serializeArticle(article: typeof articles.$inferSelect): DBLArticle {
  const parsed = parseJsonField<string[]>(article.tags);
  return {
    id: article.id,
    blogId: article.blogId,
    title: article.title,
    slug: article.slug,
    content: article.content,
    heroImage: article.heroImage,
    author: article.author,
    excerpt: article.excerpt,
    metaDescription: article.metaDescription,
    status: article.status,
    publishDate: article.publishDate ? toISO(article.publishDate) : null,
    tags: Array.isArray(parsed) ? parsed : [],
    wordCount: article.wordCount,
    readingTimeMinutes: article.readingTimeMinutes,
    createdAt: toISO(article.createdAt),
    updatedAt: toISO(article.updatedAt),
  };
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function getBlogId(): Promise<number | null> {
  try {
    const [blog] = await blogDb
      .select({ id: blogs.id })
      .from(blogs)
      .where(eq(blogs.slug, BLOG_SLUG))
      .limit(1);
    return blog?.id ?? null;
  } catch {
    return null;
  }
}

export async function getBlog(): Promise<DBLBlog | null> {
  try {
    const [blog] = await blogDb
      .select({
        id: blogs.id,
        name: blogs.name,
        slug: blogs.slug,
        description: blogs.description,
      })
      .from(blogs)
      .where(eq(blogs.slug, BLOG_SLUG))
      .limit(1);
    return blog ?? null;
  } catch {
    return null;
  }
}

export async function getPublishedArticles(options?: {
  limit?: number;
  offset?: number;
  tag?: string;
  orderDir?: 'asc' | 'desc';
}): Promise<{ articles: DBLArticle[]; total: number }> {
  try {
    const blogId = await getBlogId();
    if (!blogId) return { articles: [], total: 0 };

    const { limit = 20, offset = 0, tag, orderDir = 'desc' } = options ?? {};

    const conditions = [
      eq(articles.blogId, blogId),
      eq(articles.status, 'published'),
    ];

    const where = and(...conditions);

    const [countResult] = await blogDb
      .select({ total: sql<number>`count(*)` })
      .from(articles)
      .where(where);

    const total = Number(countResult?.total ?? 0);

    const orderFn = orderDir === 'asc' ? asc : desc;

    let results = await blogDb
      .select()
      .from(articles)
      .where(where)
      .orderBy(orderFn(articles.publishDate))
      .limit(limit)
      .offset(offset);

    if (!Array.isArray(results)) results = [];

    // Tag filter (in-memory since tags is JSON)
    if (tag) {
      results = results.filter((a) => {
        const parsed = parseJsonField<string[]>(a.tags);
        return Array.isArray(parsed) && parsed.includes(tag);
      });
    }

    return {
      articles: Array.isArray(results) ? results.map(serializeArticle) : [],
      total,
    };
  } catch {
    return { articles: [], total: 0 };
  }
}

export async function getArticlesCount(tag?: string): Promise<number> {
  try {
    const blogId = await getBlogId();
    if (!blogId) return 0;

    if (tag) {
      // Tags are stored as JSON so we must count in-memory
      const conditions = [
        eq(articles.blogId, blogId),
        eq(articles.status, 'published'),
      ];
      const results = await blogDb
        .select({ tags: articles.tags })
        .from(articles)
        .where(and(...conditions));

      if (!Array.isArray(results)) return 0;
      return results.filter((a) => {
        const parsed = parseJsonField<string[]>(a.tags);
        return Array.isArray(parsed) && parsed.includes(tag);
      }).length;
    }

    const [countResult] = await blogDb
      .select({ total: sql<number>`count(*)` })
      .from(articles)
      .where(and(eq(articles.blogId, blogId), eq(articles.status, 'published')));

    return Number(countResult?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function getArticleBySlug(slug: string): Promise<DBLArticle | null> {
  try {
    const blogId = await getBlogId();
    if (!blogId) return null;

    const [article] = await blogDb
      .select()
      .from(articles)
      .where(and(eq(articles.blogId, blogId), eq(articles.slug, slug)))
      .limit(1);

    if (!article) return null;
    return serializeArticle(article);
  } catch {
    return null;
  }
}

export async function getFeaturedArticle(): Promise<DBLArticle | null> {
  try {
    const blogId = await getBlogId();
    if (!blogId) return null;

    const [article] = await blogDb
      .select()
      .from(articles)
      .where(and(eq(articles.blogId, blogId), eq(articles.status, 'published')))
      .orderBy(desc(articles.publishDate))
      .limit(1);

    if (!article) return null;
    return serializeArticle(article);
  } catch {
    return null;
  }
}

export async function getArticleSlugs(): Promise<string[]> {
  try {
    const blogId = await getBlogId();
    if (!blogId) return [];

    const results = await blogDb
      .select({ slug: articles.slug })
      .from(articles)
      .where(and(eq(articles.blogId, blogId), eq(articles.status, 'published')));

    if (!Array.isArray(results)) return [];
    return results.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getAllTags(): Promise<string[]> {
  try {
    const { articles: allArticles } = await getPublishedArticles({ limit: 200 });
    const tagSet = new Set<string>();
    if (Array.isArray(allArticles)) {
      allArticles.forEach((a) => {
        if (Array.isArray(a.tags)) {
          a.tags.forEach((t) => tagSet.add(t));
        }
      });
    }
    return Array.from(tagSet).sort();
  } catch {
    return [];
  }
}

export async function getAdjacentArticles(
  currentSlug: string
): Promise<{ prev: DBLArticle | null; next: DBLArticle | null }> {
  try {
    const { articles: allArticles } = await getPublishedArticles({ limit: 200 });
    if (!Array.isArray(allArticles)) return { prev: null, next: null };

    const idx = allArticles.findIndex((a) => a.slug === currentSlug);
    if (idx === -1) return { prev: null, next: null };

    return {
      prev: idx < allArticles.length - 1 ? allArticles[idx + 1] : null,
      next: idx > 0 ? allArticles[idx - 1] : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

// ─── Hero Image Mapping ─────────────────────────────────────────────────────

const TOPIC_HERO_IMAGES: Record<string, string> = {
  budgeting: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
  housing: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  food: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&q=80',
  subscriptions: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
  'student life': 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80',
  travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
  debt: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
  saving: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1553729459-uj8h0pkey?w=800&q=80',
};

export function getHeroImageForTopic(tags: string[]): string {
  if (!Array.isArray(tags)) return TOPIC_HERO_IMAGES.default;
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (TOPIC_HERO_IMAGES[lower]) return TOPIC_HERO_IMAGES[lower];
  }
  return TOPIC_HERO_IMAGES.default;
}
