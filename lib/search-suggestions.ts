import { SearchSuggestion } from './types/search';
import { supabase } from './supabase';

const suggestionCache = new Map<string, { data: SearchSuggestion[]; timestamp: number }>();
const CACHE_TTL_MS = 300000; // 5 Minutes TTL

const POPULAR_TAGS: SearchSuggestion[] = [
  { type: 'tag', label: 'AI / ML', filters: { tags: ['AI'] } },
  { type: 'tag', label: 'Web3 & Blockchain', filters: { tags: ['Web3'] } },
  { type: 'tag', label: 'Cloud & DevOps', filters: { tags: ['Cloud'] } },
  { type: 'tag', label: 'Cybersecurity', filters: { tags: ['Cybersecurity'] } },
  { type: 'tag', label: 'Mobile App Dev', filters: { tags: ['Mobile'] } },
  { type: 'tag', label: 'Data Science', filters: { tags: ['Data Science'] } },
  { type: 'category', label: 'Beginner Friendly Events', filters: { difficulty: 'beginner' } },
  { type: 'category', label: '100% Online Hackathons', filters: { isOnline: true } }
];

const POPULAR_CITIES: SearchSuggestion[] = [
  { type: 'city', label: 'Bangalore', filters: { city: 'bangalore' } },
  { type: 'city', label: 'Mumbai', filters: { city: 'mumbai' } },
  { type: 'city', label: 'Delhi', filters: { city: 'delhi' } },
  { type: 'city', label: 'Pune', filters: { city: 'pune' } },
  { type: 'city', label: 'Hyderabad', filters: { city: 'hyderabad' } }
];

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const q = query.toLowerCase().trim();

  // Enforce minimum query length >= 2
  if (q.length < 2) {
    return [...POPULAR_TAGS.slice(0, 4), ...POPULAR_CITIES.slice(0, 2)];
  }

  const cached = suggestionCache.get(q);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const suggestions: SearchSuggestion[] = [];

  // 1. Match Categories & Tags
  POPULAR_TAGS.forEach(t => {
    if (t.label.toLowerCase().includes(q) || t.filters?.tags?.some(tag => tag.toLowerCase().includes(q))) {
      suggestions.push(t);
    }
  });

  // 2. Match Cities
  POPULAR_CITIES.forEach(c => {
    if (c.label.toLowerCase().includes(q)) {
      suggestions.push(c);
    }
  });

  // 3. Match Live Hackathon Titles via Supabase (Fast LIMIT 4)
  try {
    const { data } = await supabase
      .from('hackathons')
      .select('id, title, location_city')
      .eq('status', 'approved')
      .ilike('title', `%${q}%`)
      .limit(4);

    if (data && data.length > 0) {
      data.forEach(h => {
        suggestions.push({
          type: 'hackathon',
          label: h.title,
          filters: { query: h.title }
        });
      });
    }
  } catch (err) {
    console.error('Suggestions query error:', err);
    // Failure handling: return existing suggestions without throwing
  }

  const result = suggestions.slice(0, 7);
  suggestionCache.set(q, { data: result, timestamp: Date.now() });
  return result;
}
