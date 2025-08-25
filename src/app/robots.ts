
import type { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/landing', '/premium', '/login', '/investor', '/sponsor'],
      disallow: ['/admin/', '/settings/', '/achievements/', '/budget/', '/calculators/', '/categories/', '/debts/', '/financial-calendar/', '/history/', '/import/', '/net-worth/', '/notes/', '/notifications/', '/onboarding/', '/recurring/', '/reminders/', '/reports/', '/savings/', '/split-bill/', '/tutorial/'],
    },
    sitemap: 'https://www.jagaduit.top/sitemap.xml',
  }
}
