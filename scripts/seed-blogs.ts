import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { blogs } from '../src/lib/blog-schema';

const url = process.env.BLOG_DATABASE_URL || 'file:./data/blogs.db';
const authToken = process.env.BLOG_AUTH_TOKEN;

async function seed() {
  const client = createClient({ url, authToken });
  const db = drizzle(client);

  console.log('🌱 Seeding blog database...');

  const seedBlogs = [
    {
      name: 'TechPulse Daily',
      slug: 'techpulse',
      description: 'Daily tech news, reviews, and insights for the modern enthusiast.',
      domain: null, // TBD
      status: 'active' as const,
    },
    {
      name: 'SmartHomeMade',
      slug: 'smarthomemade',
      description: 'Smart home automation guides, reviews, and DIY projects.',
      domain: 'smarthomemade.com',
      status: 'active' as const,
    },
    {
      name: 'DailyBudgetLife',
      slug: 'dailybudgetlife',
      description: 'Practical budgeting tips, frugal living, and financial freedom strategies.',
      domain: 'dailybudgetlife.com',
      status: 'active' as const,
    },
  ];

  for (const blog of seedBlogs) {
    await db.insert(blogs).values(blog).onConflictDoNothing();
    console.log(`  ✅ ${blog.name} (${blog.slug})`);
  }

  console.log('✨ Blog seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
