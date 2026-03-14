import type { Metadata } from 'next'
import { TechPulseNavbar } from '../_components/navbar'
import { TechPulseFooter } from '../_components/footer'
import { CtaBanner } from '../_components/cta-banner'
import { JsonLd } from '@/components/json-ld'
import { generateBreadcrumbJsonLd, aboutBreadcrumbs } from '@/lib/blog-seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn more about TechPulse Daily — your source for breaking tech news and analysis.',
}

export default function AboutPage() {
  return (
    <div className="tp-dot-bg min-h-screen">
      <JsonLd data={generateBreadcrumbJsonLd(aboutBreadcrumbs('techpulse'))} />
      <TechPulseNavbar />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="tp-pulse-dot" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-white">
              About Tech<span style={{ color: '#ef4444' }}>Pulse</span> Daily
            </h1>
          </div>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Breaking through the noise to deliver the tech stories that matter.
          </p>
        </div>

        {/* Content */}
        <div className="tp-prose max-w-none">
          <p>
            TechPulse Daily is your daily source for breaking technology news, in-depth analysis,
            and expert opinions across the entire tech landscape — from artificial intelligence
            and machine learning to gaming, hardware, Apple, and the open source ecosystem.
          </p>

          <h2>Our Mission</h2>
          <p>
            We believe technology news should be accessible, accurate, and actionable. In an era
            of clickbait and surface-level reporting, TechPulse Daily goes deeper. We break down
            complex technical developments into clear, insightful analysis that helps you understand
            not just <em>what</em> happened, but <em>why it matters</em>.
          </p>

          <h2>What We Cover</h2>
          <ul>
            <li>
              <strong>Artificial Intelligence & Machine Learning</strong> — From foundation models
              to real-world applications, we track the AI revolution as it unfolds.
            </li>
            <li>
              <strong>Gaming</strong> — Hardware launches, game reviews, industry shifts, and the
              business of interactive entertainment.
            </li>
            <li>
              <strong>Hardware</strong> — CPUs, GPUs, storage, networking — the silicon that powers
              everything.
            </li>
            <li>
              <strong>Apple</strong> — Deep dives into the Apple ecosystem, from iOS to silicon.
            </li>
            <li>
              <strong>Open Source</strong> — The projects, communities, and licenses shaping modern
              software development.
            </li>
          </ul>

          <h2>Built Different</h2>
          <p>
            TechPulse Daily is powered by an autonomous AI content pipeline — articles are
            researched, written, and published by AI agents with human editorial oversight.
            This allows us to cover more ground faster while maintaining editorial standards.
          </p>
          <p>
            The platform itself is built with Next.js, deployed on modern infrastructure, and
            developed by{' '}
            <a href="https://commercialcoding.com" target="_blank" rel="noopener noreferrer">
              Commercial Coding
            </a>
            .
          </p>
        </div>
      </main>

      <CtaBanner />
      <TechPulseFooter />
    </div>
  )
}
