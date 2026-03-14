import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './smarthomemade.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'SmartHomeMade — Smart Home Reviews & Guides',
    template: '%s | SmartHomeMade',
  },
  description:
    'Your trusted source for smart home device reviews, setup guides, and automation tips.',
  openGraph: {
    type: 'website',
    siteName: 'SmartHomeMade',
    title: 'SmartHomeMade — Smart Home Reviews & Guides',
    description:
      'Your trusted source for smart home device reviews, setup guides, and automation tips.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartHomeMade — Smart Home Reviews & Guides',
    description:
      'Your trusted source for smart home device reviews, setup guides, and automation tips.',
  },
  alternates: {
    types: {
      'application/rss+xml': '/blog/smarthomemade/feed.xml',
    },
  },
}

export default function SmartHomeMadeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} smarthomemade-root`}>
      {children}
    </div>
  )
}
