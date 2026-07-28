import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://findathon.vercel.app';
  
  let hackathonEntries: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from('hackathons')
      .select('id, start_date')
      .eq('status', 'approved');

    if (data && Array.isArray(data)) {
      hackathonEntries = data.map((h) => ({
        url: `${baseUrl}/hackathons/${h.id}`,
        lastModified: new Date(h.start_date || Date.now()),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Error fetching hackathons for sitemap:', err);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...hackathonEntries,
  ];
}
