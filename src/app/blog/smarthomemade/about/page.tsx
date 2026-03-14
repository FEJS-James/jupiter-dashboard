import type { Metadata } from 'next'
import { SmartHomeMadeNavbar } from '../_components/navbar'
import { SmartHomeMadeFooter } from '../_components/footer'
import { JsonLd } from '@/components/json-ld'
import {
  generateBreadcrumbJsonLd,
  generateBlogPageMetadata,
  aboutBreadcrumbs,
} from '@/lib/blog-seo'

export const revalidate = 60

export const metadata: Metadata = generateBlogPageMetadata('smarthomemade', {
  title: 'About',
  description: 'Learn more about SmartHomeMade — your trusted source for smart home reviews and guides.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={generateBreadcrumbJsonLd(aboutBreadcrumbs('smarthomemade'))} />
      <SmartHomeMadeNavbar />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            About Smart<span style={{ color: '#2563eb' }}>Home</span>Made
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Making smart homes accessible, reliable, and genuinely useful — one review at a time.
          </p>
        </div>

        {/* Content */}
        <div className="shm-prose max-w-none">
          <p>
            SmartHomeMade is your trusted companion on the journey to building the perfect
            smart home. We test real devices in real homes and share honest, detailed reviews
            that help you make informed purchasing decisions.
          </p>

          <h2>Our Mission</h2>
          <p>
            The smart home market is overwhelming. Hundreds of devices, dozens of ecosystems,
            and marketing claims that often fall short of reality. Our mission is simple: cut
            through the noise and give you the information you need to build a smart home that
            actually works.
          </p>
          <p>
            Every device we review goes through weeks of real-world testing. We don&apos;t just
            unbox and review — we live with these products, push them to their limits, and report
            back honestly.
          </p>

          <h2>What We Cover</h2>
          <ul>
            <li>
              <strong>Smart Plugs & Outlets</strong> — From basic on/off switches to
              energy-monitoring powerhouses, we test them all.
            </li>
            <li>
              <strong>Lighting</strong> — Smart bulbs, light strips, switches, and complete
              lighting systems for every budget.
            </li>
            <li>
              <strong>Security</strong> — Locks, sensors, alarm systems, and everything you need
              to keep your home safe.
            </li>
            <li>
              <strong>Cameras</strong> — Indoor, outdoor, doorbell, and specialty cameras reviewed
              for image quality, features, and privacy.
            </li>
            <li>
              <strong>Climate Control</strong> — Smart thermostats, fans, air purifiers, and
              environmental sensors.
            </li>
            <li>
              <strong>Audio</strong> — Smart speakers, multi-room systems, and voice assistants
              tested for sound quality and integration.
            </li>
          </ul>

          <h2>Our Team</h2>
          <p>
            SmartHomeMade is powered by a team of smart home enthusiasts, tech writers, and
            AI-assisted content tools. We combine human expertise with cutting-edge technology
            to deliver comprehensive, accurate reviews faster than ever.
          </p>
          <p>
            The platform is built with Next.js and developed by{' '}
            <a href="https://commercialcoding.com" target="_blank" rel="noopener noreferrer">
              Commercial Coding
            </a>
            .
          </p>

          <h2>Affiliate Disclosure</h2>
          <p>
            Some of our articles contain affiliate links. When you purchase through these links,
            we may earn a small commission at no additional cost to you. This helps us keep the
            site running and fund more reviews. We always disclose affiliate links clearly at
            the top of relevant articles. Our reviews and recommendations are never influenced
            by affiliate relationships.
          </p>
        </div>
      </main>

      <SmartHomeMadeFooter />
    </div>
  )
}
