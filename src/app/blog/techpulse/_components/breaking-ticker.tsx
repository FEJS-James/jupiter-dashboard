import type { Article } from '@/lib/blog-schema'

interface BreakingTickerProps {
  articles: Article[]
}

export function BreakingTicker({ articles }: BreakingTickerProps) {
  if (!Array.isArray(articles) || articles.length === 0) return null

  // Duplicate to create seamless loop
  const headlines = articles.map((a) => a.title)
  const tickerText = headlines.join('  ●  ')

  return (
    <div
      className="w-full py-2"
      style={{
        background: 'linear-gradient(90deg, #991b1b 0%, #ef4444 50%, #991b1b 100%)',
      }}
      role="marquee"
      aria-label="Breaking news headlines"
    >
      <div className="tp-ticker">
        <div className="tp-ticker-inner">
          <span className="text-xs font-bold text-white/90 tracking-wider uppercase">
            🔴 BREAKING &nbsp;&nbsp;{tickerText}&nbsp;&nbsp;●&nbsp;&nbsp;{tickerText}
          </span>
        </div>
      </div>
    </div>
  )
}
