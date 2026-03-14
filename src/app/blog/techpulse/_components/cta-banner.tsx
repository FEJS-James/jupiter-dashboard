export function CtaBanner() {
  return (
    <section className="my-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center"
        style={{
          background: 'linear-gradient(135deg, #1a0000 0%, #030308 50%, #1a0000 100%)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
        }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Need tech built right?
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            From AI applications to full-stack platforms — we build production-grade software that scales.
          </p>
          <a
            href="https://commercialcoding.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#ef4444' }}
          >
            Visit Commercial Coding
            <span aria-hidden="true">→</span>
          </a>
        </div>
        {/* Decorative glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: '#ef4444' }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
