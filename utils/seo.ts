export function generatePageMetadata(title: string, description: string, image?: string) {
  return {
    title: `${title} | Findathon`,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
      type: 'website'
    }
  };
}
