import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { BLOG_CONFIGS } from '@/lib/blog-seo'
import './smarthomemade.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const config = BLOG_CONFIGS.smarthomemade

export const metadata: Metadata = {
  title: {
    default: `${config.name} — Smart Home Reviews & Guides`,
    template: `%s | ${config.name}`,
  },
  description: config.description,
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
