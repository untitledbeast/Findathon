'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MediaDTO } from '@/lib/domain/dtos/hackathon.dto';
import { X } from 'lucide-react';

interface GallerySectionProps {
  media: MediaDTO[];
}

export function GallerySection({ media }: GallerySectionProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!media || media.length === 0) return null;

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8 border border-purple-900/30 space-y-4">
      <h3 className="text-xl font-bold text-white">Event Gallery</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {media.map(m => (
          <div
            key={m.id}
            onClick={() => setLightboxImage(m.url)}
            className="h-36 rounded-2xl overflow-hidden cursor-pointer border border-purple-900/30 group relative"
          >
            <Image
              src={m.url}
              alt={m.caption || 'Event media'}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors z-10" />
          </div>
        ))}
      </div>

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full h-[80vh]">
            <Image
              src={lightboxImage}
              alt="Enlarged gallery preview"
              fill
              sizes="100vw"
              className="object-contain rounded-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 z-10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
