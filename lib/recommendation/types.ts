/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — TYPE DEFINITIONS
 * Pure TypeScript types — no runtime, no side effects
 * ====================================================================
 */

// ── Event Types ─────────────────────────────────────────────────────

export type RecommendationEventType =
  | 'view'
  | 'save'
  | 'unsave'
  | 'register_click'
  | 'share'
  | 'ignore'
  | 'dismiss'
  | 'apply'
  | 'search_result'
  | 'search_click';

export type FeedbackType =
  | 'interested'
  | 'not_interested'
  | 'too_advanced'
  | 'too_basic'
  | 'wrong_domain'
  | 'already_registered';

// ── User Signal Context ─────────────────────────────────────────────
// Assembled by context-builder.ts from 7 parallel Supabase queries

export interface UserSignalContext {
  /** Identity signals from developer_profiles */
  developer_profile: {
    language_scores: Record<string, number>;
    top_languages: string[];
    competencies: Record<string, number>;
    interests: string[];
    experience_level: 'beginner' | 'intermediate' | 'advanced';
    overall_score: number;
  } | null;

  /** Behavioral signals from user_interests table (tag → weight) */
  interest_weights: Record<string, number>;

  /** Hackathon IDs the user has bookmarked */
  saved_hackathon_ids: string[];

  /** Flat tag list aggregated from all saved hackathons */
  saved_hackathon_tags: string[];

  /** Last 10 search queries from search_history */
  recent_search_queries: string[];

  /** Hackathon IDs from recent view events */
  viewed_hackathon_ids: string[];

  /** Hackathon IDs explicitly dismissed */
  dismissed_hackathon_ids: string[];

  /** Hackathon IDs where event_type = 'apply' */
  registered_hackathon_ids: string[];

  /** hackathon_id → feedback string from hackathon_feedback */
  feedback: Record<string, string>;

  /** Inferred mode preference from behavioral data */
  preferred_mode: 'online' | 'offline' | 'no_preference';

  /** Top 5 tags by weight from user_interests */
  preferred_tags: string[];

  /** Experience levels the user fits (adjacent levels included) */
  preferred_experience_range: ('beginner' | 'intermediate' | 'advanced')[];

  /** User location from profile */
  user_city: string | null;
  user_country: string | null;
}

// ── Hackathon Scoring Input ─────────────────────────────────────────
// Minimal projection fetched from hackathons table for scoring

export interface HackathonScoringInput {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  difficulty: string;
  is_online: boolean;
  location_city: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  prize_amount: number;
  cover_image_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  save_count: number;
  view_count: number;
  engagement_score: number;
  organizer: string;
  tech_stack: string[];
}

// ── Signal Breakdown ────────────────────────────────────────────────

export interface SignalBreakdown {
  language_match: number;
  experience_match: number;
  domain_competency: number;
  interest_alignment: number;
  collaborative_filter: number;
  saved_similar: number;
  search_intent: number;
  view_history: number;
  deadline_urgency: number;
  location_match: number;
  mode_preference: number;
  hackathon_quality: number;
  organizer_reputation: number;
  prize_relevance: number;
  penalties: number;
}

// ── Scored Hackathon ────────────────────────────────────────────────

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';

export interface ScoredHackathon {
  hackathon: HackathonScoringInput;
  /** 0–100 normalized score */
  final_score: number;
  /** Pre-normalization raw score */
  raw_score: number;
  /** Per-signal point breakdown */
  signal_breakdown: SignalBreakdown;
  /** Human-readable explanation strings */
  explanations: string[];
  /** Confidence derived from how many signals contributed */
  confidence: ConfidenceLevel;
  /** Single sentence for UI display */
  recommendation_reason: string;
}

// ── API Response ────────────────────────────────────────────────────

export interface RecommendationV2Response {
  success: boolean;
  data: {
    recommendations: Array<{
      id: string;
      title: string;
      slug: string;
      description: string;
      tags: string[];
      difficulty: string;
      is_online: boolean;
      location_city: string | null;
      start_date: string;
      end_date: string;
      registration_deadline: string | null;
      prize_amount: number;
      cover_image_url: string | null;
      is_verified: boolean;
      is_featured: boolean;
      organizer: string;
      match_score: number;
      confidence: ConfidenceLevel;
      reasons: string[];
      recommendation_reason: string;
      signal_breakdown: SignalBreakdown;
    }>;
    total: number;
    context_signals: {
      has_developer_profile: boolean;
      preferred_mode: string;
      top_interests: string[];
      experience_level: string | undefined;
    };
  };
}
