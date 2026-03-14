import Link from 'next/link';

type NavPage = 'home' | 'articles' | 'about' | null;

const NAV_LINKS: { href: string; label: string; page: NavPage }[] = [
  { href: '/blog/dailybudgetlife', label: 'Home', page: 'home' },
  { href: '/blog/dailybudgetlife/blog', label: 'Articles', page: 'articles' },
  { href: '/blog/dailybudgetlife/about', label: 'About', page: 'about' },
];

export function Navbar({ activePage }: { activePage?: NavPage }) {
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
          {NAV_LINKS.map((link) => {
            const isActive = activePage === link.page;
            return (
              <Link
                key={link.page}
                href={link.href}
                className={`transition ${isActive ? 'font-bold' : 'hover:text-gray-900'}`}
                style={isActive ? { color: '#059669' } : undefined}
              >
                {link.label}
              </Link>
            );
          })}
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
