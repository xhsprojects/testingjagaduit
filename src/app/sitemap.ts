
import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '',
    '/landing',
    '/login',
    '/premium',
    '/investor',
    '/sponsor'
  ];

  const routes = staticRoutes.map((route) => ({
    url: `https://www.jagaduit.top${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
 
  return routes;
}
