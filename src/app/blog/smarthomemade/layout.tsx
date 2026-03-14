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
