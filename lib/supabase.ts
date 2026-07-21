import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Hackathon {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location_city: string | null;
  location_college: string | null;
  is_online: boolean;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url: string | null;
  status: string;
  created_at?: string;
}

export interface SavedHackathon {
  id?: string;
  user_id: string;
  hackathon_id: string;
  saved_at?: string;
}

export const MOCK_HACKATHONS: Hackathon[] = [
  {
    id: '1a8e9944-59e2-4d2b-92b0-023a1a111111',
    title: 'AI Innovators Global Hackathon 2026',
    description: 'Build cutting-edge AI and LLM solutions using Next.js, PyTorch, and Supabase.',
    start_date: '2026-08-15',
    end_date: '2026-08-17',
    location_city: 'San Francisco',
    location_college: 'Stanford University',
    is_online: true,
    tags: ['AI', 'Machine Learning', 'Next.js', 'Python'],
    register_url: 'https://ai-innovators-2026.devpost.com',
    organizer: 'OpenAI & Supabase Community',
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    status: 'approved',
    created_at: '2026-07-01T10:00:00Z'
  },
  {
    id: '2b9f8833-48d1-4c1a-81a0-112b2b222222',
    title: 'Web3 & Decentralized Future Summit',
    description: 'A 48-hour hackathon for blockchain developers and Web3 enthusiasts.',
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    location_city: 'New York',
    location_college: 'Columbia University',
    is_online: false,
    tags: ['Web3', 'Blockchain', 'Solidity', 'Ethereum'],
    register_url: 'https://ethglobal.com',
    organizer: 'Ethereum Foundation',
    cover_image_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop',
    status: 'approved',
    created_at: '2026-07-05T12:00:00Z'
  }
];

export async function fetchHackathons(): Promise<Hackathon[]> {
  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('Supabase empty, using mock data:', error?.message);
      return MOCK_HACKATHONS;
    }

    return data as Hackathon[];
  } catch (err) {
    console.error('Error fetching hackathons:', err);
    return MOCK_HACKATHONS;
  }
}

export async function fetchHackathonById(id: string): Promise<Hackathon | null> {
  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return MOCK_HACKATHONS.find(h => h.id === id) || MOCK_HACKATHONS[0];
    }

    return data as Hackathon;
  } catch (err) {
    console.error('Error fetching hackathon by id:', err);
    return MOCK_HACKATHONS.find(h => h.id === id) || MOCK_HACKATHONS[0];
  }
}

export async function submitHackathon(
  hackathonData: Omit<Hackathon, 'id' | 'created_at' | 'status'>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      ...hackathonData,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('hackathons')
      .insert([payload])
      .select();

    if (error) {
      console.error('Supabase submit error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (err: any) {
    console.error('Submit hackathon exception:', err);
    return { success: false, error: err.message || 'Failed to submit hackathon' };
  }
}

export async function toggleSavedHackathon(
  userId: string,
  hackathonId: string
): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('saved_hackathons')
      .select('id')
      .eq('user_id', userId)
      .eq('hackathon_id', hackathonId)
      .single();

    if (existing) {
      await supabase
        .from('saved_hackathons')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      await supabase
        .from('saved_hackathons')
        .insert([{ user_id: userId, hackathon_id: hackathonId, saved_at: new Date().toISOString() }]);
      return true;
    }
  } catch (err) {
    console.error('Error toggling saved hackathon:', err);
    return true;
  }
}