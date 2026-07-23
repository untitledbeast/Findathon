import { SearchFilters, ParsedIntent } from './types/search';

const SYNONYMS: Record<string, string[]> = {
  'AI': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'genai'],
  'Web3': ['web3', 'blockchain', 'crypto', 'defi', 'nft', 'ethereum', 'solana'],
  'Cloud': ['cloud', 'aws', 'gcp', 'azure', 'devops', 'kubernetes'],
  'Cybersecurity': ['cybersecurity', 'security', 'ctf', 'hacking', 'infosec'],
  'Mobile': ['mobile', 'android', 'ios', 'react native', 'flutter'],
  'Data Science': ['data science', 'analytics', 'data'],
  'Game Dev': ['game', 'gaming', 'unity', 'unreal', 'gamedev'],
  'Open Source': ['open source', 'opensource', 'github'],
  'Robotics': ['robotics', 'robot', 'automation', 'iot']
};

const KNOWN_CITIES = [
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'pune', 'hyderabad',
  'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'noida', 'gurgaon'
];

export function parseSearchIntent(input: string): ParsedIntent {
  const raw = input.toLowerCase().trim();
  const filters: SearchFilters = {};
  const entities = {
    tags: [] as string[],
    city: null as string | null,
    difficulty: null as string | null,
    isOnline: null as boolean | null,
    prizeMin: null as number | null,
    timeframe: { start: null as string | null, end: null as string | null }
  };

  let remainingQuery = raw;

  // 1. Prize Amount Regex Extraction
  const prizeMatch = raw.match(
    /prize[s]?\s*(?:above|over|greater than|>|min|minimum|atleast|at least)?\s*[₹$]?\s*(\d+(?:\.\d+)?)\s*([kK]?)/
  );
  if (prizeMatch) {
    let amount = parseFloat(prizeMatch[1]);
    if (prizeMatch[2].toLowerCase() === 'k') amount *= 1000;
    filters.prizeMin = amount;
    entities.prizeMin = amount;
    remainingQuery = remainingQuery.replace(prizeMatch[0], '');
  }

  // 2. Online / In-Person Mode Detection
  if (/\b(online|remote|virtual|anywhere|worldwide)\b/.test(raw)) {
    filters.isOnline = true;
    entities.isOnline = true;
    remainingQuery = remainingQuery.replace(/\b(online|remote|virtual|anywhere|worldwide)\b/g, '');
  } else if (/\b(offline|in.person|in person|onsite|physical)\b/.test(raw)) {
    filters.isOnline = false;
    entities.isOnline = false;
    remainingQuery = remainingQuery.replace(/\b(offline|in.person|in person|onsite|physical)\b/g, '');
  }

  // 3. Difficulty Level Detection
  if (/\b(beginner|beginner.friendly|first|fresher|newbie|starter|easy)\b/.test(raw)) {
    filters.difficulty = 'beginner';
    entities.difficulty = 'beginner';
    remainingQuery = remainingQuery.replace(/\b(beginner|beginner.friendly|first|fresher|newbie|starter|easy)\b/g, '');
  } else if (/\b(advanced|expert|senior|hard)\b/.test(raw)) {
    filters.difficulty = 'advanced';
    entities.difficulty = 'advanced';
  } else if (/\b(intermediate|medium)\b/.test(raw)) {
    filters.difficulty = 'intermediate';
    entities.difficulty = 'intermediate';
  }

  // 4. Timeframe Extraction
  const today = new Date();
  const getDateStr = (d: Date) => d.toISOString().split('T')[0];

  if (/\b(this weekend|weekend)\b/.test(raw)) {
    const day = today.getDay();
    const friday = new Date(today);
    friday.setDate(today.getDate() + ((5 - day + 7) % 7));
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    filters.startAfter = getDateStr(friday);
    filters.startBefore = getDateStr(sunday);
    entities.timeframe = { start: getDateStr(friday), end: getDateStr(sunday) };
    remainingQuery = remainingQuery.replace(/\b(this weekend|weekend)\b/g, '');
  } else if (/\b(this month)\b/.test(raw)) {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    filters.startAfter = getDateStr(today);
    filters.startBefore = getDateStr(endOfMonth);
  }

  // 5. City Extraction
  KNOWN_CITIES.forEach(city => {
    const regex = new RegExp(`\\b(in\\s+)?${city}\\b`, 'i');
    if (regex.test(raw)) {
      filters.city = city;
      entities.city = city;
      remainingQuery = remainingQuery.replace(regex, '');
    }
  });

  // 6. Synonym Tag Expansion
  Object.entries(SYNONYMS).forEach(([canonicalTag, keywords]) => {
    if (keywords.some(kw => raw.includes(kw))) {
      if (!entities.tags.includes(canonicalTag)) {
        entities.tags.push(canonicalTag);
      }
    }
  });

  if (entities.tags.length > 0) {
    filters.tags = entities.tags;
  }

  // 7. Clean Stop Words for Final Query String
  const stopWords = ['hackathon', 'hackathons', 'event', 'events', 'the', 'a', 'an', 'for', 'with', 'in', 'at', 'on', 'and', 'or', 'find', 'show', 'me', 'want', 'looking', 'good', 'best', 'top', 'give'];
  const cleaned = remainingQuery
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w))
    .join(' ')
    .trim();

  return {
    query: cleaned,
    filters: { ...filters, query: cleaned || undefined },
    confidence: (entities.tags.length > 0 || entities.city || entities.isOnline !== null) ? 0.95 : 0.6,
    detectedEntities: entities
  };
}
