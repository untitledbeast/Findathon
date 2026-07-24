import { HackathonDetailDTO } from '../domain/dtos/hackathon.dto';

export const MetadataService = {
  generateHackathonMetadata(hackathon: HackathonDetailDTO | null) {
    if (!hackathon) {
      return {
        title: 'Hackathon Not Found | Findathon',
        description: 'Explore premier hackathons worldwide on Findathon.'
      };
    }

    return {
      title: `${hackathon.seoTitle || hackathon.title} | Findathon`,
      description: hackathon.seoDescription || hackathon.description.slice(0, 160),
      openGraph: {
        title: hackathon.title,
        description: hackathon.description.slice(0, 160),
        images: [hackathon.ogImageUrl || hackathon.coverImageUrl || ''],
        type: 'website'
      }
    };
  },

  generateJsonLd(hackathon: HackathonDetailDTO) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: hackathon.title,
      startDate: hackathon.startDate,
      endDate: hackathon.endDate,
      location: hackathon.isOnline
        ? { '@type': 'VirtualLocation' }
        : {
            '@type': 'Place',
            name: hackathon.locationCollege || hackathon.locationCity || 'India',
            address: hackathon.fullAddress || hackathon.locationCity || ''
          },
      organizer: {
        '@type': 'Organization',
        name: hackathon.organizerName
      },
      description: hackathon.description,
      url: `https://findathon.app/hackathons/${hackathon.id}`
    };
  }
};
