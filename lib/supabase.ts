import { createBrowserClient } from '@supabase/ssr';
import { HackathonDatabaseRow } from '@/types';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Legacy exports — kept for compatibility with repository.ts, dto.ts, etc.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type Hackathon = HackathonDatabaseRow;
export const MOCK_HACKATHONS: Hackathon[] = [];