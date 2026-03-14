import Link from 'next/link'

export function SmartHomeMadeFooter() {
  return (
    <footer className="mt-20 bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold text-white mb-4 block">
              Smart<span style={{ color: '#2563eb' }}>Home</span>Made
            </span>
            <p className="text-sm text-gray-500">
              Your trusted source for smart home device reviews, setup guides, and automation tips.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Navigate</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/blog/smarthomemade"
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/smarthomemade/blog"
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  All Reviews
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/smarthomemade/about"
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Categories</h3>
            <ul className="space-y-2">
              {['Smart Plugs', 'Lighting', 'Security', 'Cameras', 'Climate', 'Audio'].map(
                (cat) => (
                  <li key={cat}>
                    <Link
                      href={`/blog/smarthomemade/blog?tag=${encodeURIComponent(cat.toLowerCase())}`}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {cat}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Stay Connected */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Stay Connected</h3>
            <p className="text-sm text-gray-500 mb-3">
              Get weekly smart home tips and reviews delivered to your inbox.
            </p>
            <p className="text-xs text-gray-600">
              Subscribe via our newsletter above.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} SmartHomeMade. All rights reserved.
          </p>
          <a
            href="https://commercialcoding.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-blue-400 transition-colors"
          >
            Built by Commercial Coding
          </a>
        </div>
      </div>
    </footer>
  )
}
