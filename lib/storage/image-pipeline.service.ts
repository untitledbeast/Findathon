/**
 * INERT INFRASTRUCTURE CONTRACT
 * Reserved for future image optimization & CDN pipelines when File Upload UX is implemented.
 * Tracked in docs/architecture.md.
 */
export interface ImageVariants {
  original: string;
  thumbnail: string;
  webp: string;
  optimized: string;
}

export const ImagePipelineService = {
  processImageUrl(url: string): ImageVariants {
    if (!url) {
      const fallback = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80';
      return {
        original: fallback,
        thumbnail: fallback,
        webp: fallback,
        optimized: fallback
      };
    }

    return {
      original: url,
      thumbnail: `${url}?w=300&q=80`,
      webp: `${url}?format=webp`,
      optimized: `${url}?auto=format&fit=crop&w=800&q=80`
    };
  }
};
