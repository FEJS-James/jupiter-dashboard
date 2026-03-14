import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './techpulse.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: {
    default: 'TechPulse Daily — Breaking Tech News & Analysis',
    template: '%s | TechPulse Daily',
  },
  description:
    'Your daily source for breaking tech news, in-depth analysis, and expert opinions on AI, gaming, hardware, and open source.',
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
