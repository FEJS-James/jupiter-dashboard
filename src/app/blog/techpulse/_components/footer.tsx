import Link from 'next/link'

export function TechPulseFooter() {
  return (
    <footer className="border-t border-white/5 mt-20" style={{ backgroundColor: '#030308' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="tp-pulse-dot" aria-hidden="true" />
              <span className="text-lg font-bold text-white">
                Tech<span style={{ color: '#ef4444' }}>Pulse</span> Daily
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Your daily source for breaking tech news, in-depth analysis, and expert opinions.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Navigate</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/blog/techpulse" className="text-sm text-gray-500 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/blog/techpulse/blog" className="text-sm text-gray-500 hover:text-white transition-colors">
                  All Posts
                </Link>
              </li>
              <li>
                <Link href="/blog/techpulse/about" className="text-sm text-gray-500 hover:text-white transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Topics</h3>
            <ul className="space-y-2">
              {['AI', 'Gaming', 'Hardware', 'Apple', 'Open Source'].map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/blog/techpulse/blog?tag=${encodeURIComponent(cat.toLowerCase())}`}
                    className="text-sm text-gray-500 hover:text-white transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} TechPulse Daily. All rights reserved.
          </p>
          <a
            href="https://commercialcoding.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            Built by Commercial Coding
          </a>
        </div>
      </div>
    </footer>
  )
}
