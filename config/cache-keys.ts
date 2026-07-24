export const CacheKeys = {
  hackathon: (id: string) => `hackathon_detail_${id}`,
  organizer: (slug: string) => `organizer_detail_${slug}`,
  university: (slug: string) => `university_detail_${slug}`,
  city: (slug: string) => `city_detail_${slug}`,
  search: (query: string) => `search_results_${encodeURIComponent(query)}`,
  related: (id: string) => `hackathon_related_${id}`,
  trending: () => `trending_hackathons_list`,
  userBookmarks: (userId: string) => `user_bookmarks_${userId}`
};
