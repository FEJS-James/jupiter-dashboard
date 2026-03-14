import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { BLOG_CONFIGS } from '@/lib/blog-seo'
import './techpulse.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const config = BLOG_CONFIGS.techpulse

export const metadata: Metadata = {
  title: {
    default: `${config.name} — Breaking Tech News & Analysis`,
    template: `%s | ${config.name}`,
  },
  description: config.description,
}

export default function TechPulseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${spaceGrotesk.variable} techpulse-root`}>
      {children}
    </div>
  )
}
