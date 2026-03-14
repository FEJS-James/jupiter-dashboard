import Link from 'next/link'

const categories = [
  { label: '🔌 Smart Plugs', tag: 'smart plugs' },
  { label: '💡 Lighting', tag: 'lighting' },
  { label: '🔒 Security', tag: 'security' },
  { label: '📷 Cameras', tag: 'cameras' },
  { label: '🌡️ Climate', tag: 'climate' },
  { label: '🎵 Audio', tag: 'audio' },
]

export function SmartHomeMadeNavbar() {
  return (
    <>
      {/* Accent bar */}
      <div className="shm-accent-bar" />

      <header
        className="sticky top-0 z-50 border-b border-gray-200"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main nav */}
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/blog/smarthomemade"
              className="flex items-center gap-2"
              aria-label="SmartHomeMade home"
            >
              <span className="text-xl font-bold text-gray-900">
                Smart<span style={{ color: '#2563eb' }}>Home</span>Made
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-6" aria-label="Main navigation">
              <Link
                href="/blog/smarthomemade/blog"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                All Reviews
              </Link>
              <Link
                href="/blog/smarthomemade/about"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                About
              </Link>
            </nav>

            {/* Mobile nav */}
            <div className="sm:hidden flex items-center gap-4">
              <Link
                href="/blog/smarthomemade/blog"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Reviews
              </Link>
              <Link
                href="/blog/smarthomemade/about"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                About
              </Link>
            </div>
          </div>

          {/* Category bar */}
          <nav
            className="flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide"
            aria-label="Categories"
          >
            {categories.map((cat) => (
              <Link
                key={cat.tag}
                href={`/blog/smarthomemade/blog?tag=${encodeURIComponent(cat.tag)}`}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
