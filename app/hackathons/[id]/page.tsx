import React from 'react';
import type { Metadata } from 'next';
import HackathonDetailClient from './HackathonDetailClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

async function getHackathonById(id: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase.from('hackathons').select('*').eq('id', id).single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const resolvedParams = await params;
  const hackathon = await getHackathonById(resolvedParams.id).catch(() => null);
  
  if (!hackathon) {
    return {
      title: 'Hackathon Not Found | Findathon',
      description: 'This hackathon could not be found.',
    };
  }

  const description = hackathon.description?.slice(0, 155) + 
    (hackathon.description?.length > 155 ? '…' : '');

  return {
    title: `${hackathon.title} | Findathon`,
    description,
    alternates: {
      canonical: `/hackathons/${resolvedParams.id}`,
    },
    openGraph: {
      title: hackathon.title,
      description,
      type: 'website',
      url: `/hackathons/${resolvedParams.id}`,
      images: hackathon.cover_image_url
        ? [{ url: hackathon.cover_image_url, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: hackathon.title,
      description,
    },
    keywords: [
      hackathon.title,
      'hackathon',
      hackathon.location_city,
      hackathon.location_college,
      ...(hackathon.tags ?? []),
      'findathon',
      'India hackathon',
    ].filter(Boolean),
  };
}

export default async function HackathonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const hackathon = await getHackathonById(resolvedParams.id).catch(() => null);

  const jsonLd = hackathon ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: hackathon.title,
    startDate: hackathon.start_date,
    endDate: hackathon.end_date,
    location: hackathon.is_online
      ? { '@type': 'VirtualLocation', url: hackathon.register_url }
      : { '@type': 'Place', name: hackathon.location_college || 'Venue', address: hackathon.location_city || 'India' },
    organizer: { '@type': 'Organization', name: hackathon.organizer || 'Findathon' },
    description: hackathon.description,
    image: hackathon.cover_image_url || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://findathon.vercel.app'}/hackathons/${resolvedParams.id}`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <HackathonDetailClient params={params} />
    </>
  );
}
