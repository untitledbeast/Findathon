import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Hackathon {
  id: string;
  title: string;
  tagline?: string | null;
  description: string;
  start_date: string;
  end_date: string;
  registration_deadline?: string | null;
  location_city?: string | null;
  location_college?: string | null;
  full_address?: string | null;
  is_online: boolean;
  mode?: 'Online' | 'Offline' | 'Hybrid' | string;
  tags: string[];
  register_url: string;
  organizer: string;
  cover_image_url?: string | null;
  status: string; // 'pending' | 'approved' | 'rejected'
  created_at?: string;
  min_team_size?: number | null;
  max_team_size?: number | null;
  solo_allowed?: boolean;
  eligibility?: string | string[] | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_name?: string | null;
  organization?: string | null;
  social_twitter?: string | null;
  social_linkedin?: string | null;
  social_discord?: string | null;
  social_instagram?: string | null;
  submitted_by?: string | null;
  domain?: string | null;
  prize_pool?: string | null;
  registration_fee?: 'Free' | 'Paid' | string | null;
  registration_fee_amount?: string | null;
  requirements?: string | null;
}

export interface SavedHackathon {
  id?: string;
  user_id: string;
  hackathon_id: string;
  saved_at?: string;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  organization?: string | null;
  phone?: string | null;
  website?: string | null;
  social_twitter?: string | null;
  social_linkedin?: string | null;
  social_instagram?: string | null;
  social_discord?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
    picture?: string;
  };
}

// Fallback seed data with enriched schema
export const MOCK_HACKATHONS: Hackathon[] = [
  {
    id: '1a8e9944-59e2-4d2b-92b0-023a1a111111',
    title: 'AI Innovators Global Hackathon 2026',
    tagline: 'Build next-gen LLM and Autonomous Agent applications',
    description: 'Build cutting-edge artificial intelligence and LLM solutions using Next.js, PyTorch, and Supabase. Over $50,000 in prizes, mentorship from top Silicon Valley founders, and instant funding opportunities for top teams!',
    start_date: '2026-08-15',
    end_date: '2026-08-17',
    registration_deadline: '2026-08-10',
    location_city: 'San Francisco',
    location_college: 'Stanford University',
    full_address: '450 Jane Stanford Way, Stanford, CA 94305, United States',
    is_online: true,
    mode: 'Hybrid',
    tags: ['AI', 'Machine Learning', 'Next.js', 'Python'],
    register_url: 'https://ai-innovators-2026.devpost.com',
    organizer: 'OpenAI & Supabase Community',
    organization: 'OpenAI Developer Network',
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    status: 'approved',
    created_at: '2026-07-01T10:00:00Z',
    min_team_size: 1,
    max_team_size: 4,
    solo_allowed: true,
    eligibility: 'Open to All',
    contact_name: 'Alex Rivera',
    contact_email: 'alex@ai-innovators.org',
    contact_phone: '+1 415 555 0192',
    social_twitter: 'ai_innovators',
    social_linkedin: 'https://linkedin.com/company/ai-innovators',
    social_discord: 'https://discord.gg/ai-innovators',
    social_instagram: 'ai_innovators_official',
    submitted_by: 'mock-user-1',
    prize_pool: '$50,000',
    registration_fee: 'Free'
  },
  {
    id: '2b9f8833-48d1-4c1a-81a0-112b2b222222',
    title: 'Web3 & Decentralized Future Summit',
    tagline: 'Craft zero-knowledge dApps & decentralized protocols',
    description: 'A 48-hour intense hackathon bringing together blockchain developers, smart contract engineers, and Web3 enthusiasts to craft zero-knowledge dApps and decentralized infrastructure.',
    start_date: '2026-09-01',
    end_date: '2026-09-03',
    registration_deadline: '2026-08-25',
    location_city: 'New York',
    location_college: 'Columbia University',
    full_address: '116th St & Broadway, New York, NY 10027, United States',
    is_online: false,
    mode: 'Offline',
    tags: ['Web3', 'Blockchain', 'Solidity', 'Ethereum'],
    register_url: 'https://ethglobal.com',
    organizer: 'Ethereum Foundation & NYC Tech',
    organization: 'Ethereum Foundation',
    cover_image_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1200&auto=format&fit=crop',
    status: 'approved',
    created_at: '2026-07-05T12:00:00Z',
    min_team_size: 2,
    max_team_size: 5,
    solo_allowed: false,
    eligibility: 'Open to All',
    contact_name: 'Sarah Chen',
    contact_email: 'sarah@ethglobal.com',
    contact_phone: '+1 212 555 0188',
    social_twitter: 'ethglobal',
    social_linkedin: 'https://linkedin.com/company/ethglobal',
    social_discord: 'https://discord.gg/ethglobal',
    submitted_by: 'mock-user-2',
    prize_pool: '$35,000',
    registration_fee: 'Free'
  },
  {
    id: '3c7d7722-37c0-4b09-709f-223c3c333333',
    title: 'Campus CodeFest 2026',
    tagline: 'The premier student hackathon across top Indian universities',
    description: 'The premier student hackathon for undergraduates and high school coders across India and abroad. Problem statements range from Healthcare to Smart Cities and EdTech.',
    start_date: '2026-08-28',
    end_date: '2026-08-30',
    registration_deadline: '2026-08-20',
    location_city: 'Bengaluru',
    location_college: 'IISc Bengaluru',
    full_address: 'CV Raman Rd, Bengaluru, Karnataka 560012, India',
    is_online: false,
    mode: 'Offline',
    tags: ['Student', 'Open Source', 'FullStack', 'AI'],
    register_url: 'https://campuscodefest2026.org',
    organizer: 'IISc Developer Club',
    organization: 'Indian Institute of Science',
    cover_image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
    status: 'approved',
    created_at: '2026-07-10T15:00:00Z',
    min_team_size: 1,
    max_team_size: 4,
    solo_allowed: true,
    eligibility: 'Students Only',
    contact_name: 'Rohan Sharma',
    contact_email: 'rohan@iisc.ac.in',
    contact_phone: '+91 98765 43210',
    social_twitter: 'iisc_codefest',
    social_instagram: 'iisc_devs',
    submitted_by: 'mock-user-1',
    prize_pool: '₹5,00,000',
    registration_fee: 'Free'
  }
];

// Helper Functions
export async function fetchHackathons(): Promise<Hackathon[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return MOCK_HACKATHONS;
    }

    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('Supabase fetch query returned empty or error, using mock data:', error?.message);
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
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return MOCK_HACKATHONS.find(h => h.id === id) || MOCK_HACKATHONS[0];
    }

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

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return {
        id: userId,
        full_name: 'Developer User',
        bio: 'Full-stack developer building cool apps on Findathon!',
        organization: 'Findathon Community',
        phone: '+91 98765 43210',
        website: 'https://findathon.dev'
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }

    return data as Profile;
  } catch (err) {
    console.error('Exception in getProfile:', err);
    return null;
  }
}

export async function updateProfile(userId: string, profileData: Partial<Profile>): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const payload = {
      id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return { success: true, data: payload as Profile };
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update profile' };
  }
}

export async function getUserHackathons(userId: string): Promise<Hackathon[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      return MOCK_HACKATHONS.filter(h => h.submitted_by === userId || h.submitted_by === 'mock-user-1');
    }

    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('getUserHackathons warning:', error?.message);
      return MOCK_HACKATHONS.filter(h => h.submitted_by === userId);
    }

    return data as Hackathon[];
  } catch (err) {
    console.error('Error fetching user hackathons:', err);
    return [];
  }
}

export async function signInWithGoogle() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectTo = `${origin}/auth/callback`;

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function submitHackathon(hackathonData: Partial<Hackathon>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      ...hackathonData,
      status: hackathonData.status || 'pending',
      created_at: new Date().toISOString()
    };

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      const mockSubmitted: Hackathon = {
        ...(payload as Hackathon),
        id: `submit-${Date.now()}`
      };
      MOCK_HACKATHONS.unshift(mockSubmitted);
      return { success: true, data: mockSubmitted };
    }

    const { data, error } = await supabase
      .from('hackathons')
      .insert([payload])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (err: any) {
    console.error('Submit hackathon exception:', err);
    return { success: false, error: err.message || 'Failed to submit hackathon' };
  }
}