import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { BLOG_CONFIGS } from '@/lib/blog-seo';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const config = BLOG_CONFIGS.dailybudgetlife;

export const metadata: Metadata = {
  title: {
    default: `${config.name} — Smart Money, Simple Living`,
    template: `%s | ${config.name}`,
  },
  description: config.description,
};

export default function DailyBudgetLifeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${dmSans.variable} font-[family-name:var(--font-dm-sans)] min-h-screen`}
      style={{ backgroundColor: '#fafaf9', color: '#111827' }}
    >
      {children}
    </div>
  );
}
