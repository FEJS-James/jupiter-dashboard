import Link from 'next/link';

/** Full 3-column footer used on the homepage. */
export function Footer() {
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

/** Compact centered footer used on inner pages. */
export function FooterCompact({ className }: { className?: string }) {
  return (
    <footer
      className={`py-8 ${className ?? ''}`}
      style={{ backgroundColor: '#1c1917', color: '#d6d3d1' }}
    >
      <div className="mx-auto max-w-5xl px-6 text-center text-sm">
        <Link href="/blog/dailybudgetlife" className="transition hover:text-white">
          Daily<span style={{ color: '#059669' }}>Budget</span>Life
        </Link>
        <p className="mt-2 text-xs text-stone-500">
          © {new Date().getFullYear()} DailyBudgetLife. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
