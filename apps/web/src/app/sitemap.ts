import { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api-client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/books`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/wishlist`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  try {
    const booksData = await apiClient<{ items: any[] }>('/books?limit=100');
    const bookRoutes: MetadataRoute.Sitemap = (booksData.items || []).map((book) => ({
      url: `${baseUrl}/books/${book.slug}`,
      lastModified: new Date(book.updatedAt || book.createdAt || new Date()),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticRoutes, ...bookRoutes];
  } catch {
    return staticRoutes;
  }
}
