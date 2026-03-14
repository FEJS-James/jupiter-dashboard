import Link from 'next/link'

const categories = [
  { label: 'Gaming', tag: 'gaming' },
  { label: 'Hardware', tag: 'hardware' },
  { label: 'AI', tag: 'ai' },
  { label: 'Apple', tag: 'apple' },
  { label: 'Open Source', tag: 'open source' },
]

export function TechPulseNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5" style={{ backgroundColor: 'rgba(3, 3, 8, 0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main nav */}
        <div className="flex h-16 items-center justify-between">
          <Link href="/blog/techpulse" className="flex items-center gap-2" aria-label="TechPulse Daily home">
            <span className="tp-pulse-dot" aria-hidden="true" />
            <span className="text-xl font-bold text-white">
              Tech<span style={{ color: '#ef4444' }}>Pulse</span> Daily
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6" aria-label="Main navigation">
            <Link href="/blog/techpulse/blog" className="text-sm text-gray-400 hover:text-white transition-colors">
              All Posts
            </Link>
            <Link href="/blog/techpulse/about" className="text-sm text-gray-400 hover:text-white transition-colors">
              About
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center gap-4">
            <Link href="/blog/techpulse/blog" className="text-sm text-gray-400 hover:text-white">
              Posts
            </Link>
            <Link href="/blog/techpulse/about" className="text-sm text-gray-400 hover:text-white">
              About
            </Link>
          </div>
        </div>

        {/* Category bar */}
        <nav className="flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide" aria-label="Categories">
          {categories.map((cat) => (
            <Link
              key={cat.tag}
              href={`/blog/techpulse/blog?tag=${encodeURIComponent(cat.tag)}`}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {cat.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
