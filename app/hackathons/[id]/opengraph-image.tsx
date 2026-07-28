import React from 'react';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://findathon.vercel.app';
  
  const hackathon = await fetch(`${baseUrl}/api/v1/hackathons/${id}`, { cache: 'no-store' })
    .then(r => r.json())
    .then(r => r.data)
    .catch(() => null);

  const title = hackathon?.title ?? 'Hackathon';
  const location = hackathon?.locationCity || hackathon?.location_city || 'Online';
  const dateStr = (hackathon?.startDate || hackathon?.start_date)?.slice(0, 10) ?? '';
  const prize = hackathon?.prizePool || hackathon?.prize_pool;

  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(135deg, #0b0f19 0%, #1a0f35 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        fontFamily: 'sans-serif',
      }}>
        <div style={{ color: '#7C3AED', fontSize: 24, marginBottom: 16 }}>
          findathon.vercel.app
        </div>
        <div style={{ color: 'white', fontSize: 56, fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>
          {title}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 28 }}>
          {location}{dateStr ? ` · ${dateStr}` : ''}
        </div>
        {prize && (
          <div style={{ color: '#fbbf24', fontSize: 24, marginTop: 20 }}>
            🏆 {prize}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
