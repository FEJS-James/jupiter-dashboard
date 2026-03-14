import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DailyBudgetLife — Smart Money, Simple Living',
    template: '%s | DailyBudgetLife',
  },
  description:
    'Practical personal finance tips, budgeting strategies, and money-saving guides for everyday life.',
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
