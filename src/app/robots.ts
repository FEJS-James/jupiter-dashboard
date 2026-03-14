import type { MetadataRoute } from 'next'
import { blogFullUrl } from '@/lib/blog-seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: [
      `${blogFullUrl('techpulse')}/sitemap.xml`,
      `${blogFullUrl('smarthomemade')}/sitemap.xml`,
      `${blogFullUrl('dailybudgetlife')}/sitemap.xml`,
    ],
  }
}
