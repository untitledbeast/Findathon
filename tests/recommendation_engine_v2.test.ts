import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreHackathon } from '../lib/recommendation/engine';
import { SIGNALS, MAX_POSITIVE_SCORE } from '../lib/recommendation/signals';
import type {
  UserSignalContext,
  HackathonScoringInput,
} from '../lib/recommendation/types';

function createMockHackathon(overrides?: Partial<HackathonScoringInput>): HackathonScoringInput {
  return {
    id: 'h-100',
    title: 'AI Global Hackathon 2026',
    slug: 'ai-global-hackathon-2026',
    description: 'Build cutting-edge AI applications with Next.js, Python, and PyTorch.',
    tags: ['ai', 'python', 'pytorch', 'nextjs'],
    difficulty: 'intermediate',
    is_online: true,
    location_city: 'San Francisco',
    start_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    registration_deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    prize_amount: 25000,
    cover_image_url: 'https://images.unsplash.com/photo-ai.jpg',
    is_verified: true,
    is_featured: true,
    avg_rating: 4.8,
    review_count: 24,
    save_count: 150,
    view_count: 1200,
    engagement_score: 0.85,
    organizer: 'Google Developer Student Clubs',
    tech_stack: ['Python', 'TypeScript', 'PyTorch'],
    ...overrides,
  };
}

function createMockContext(overrides?: Partial<UserSignalContext>): UserSignalContext {
  return {
    developer_profile: {
      language_scores: {
        python: 90,
        typescript: 80,
      },
      top_languages: ['Python', 'TypeScript'],
      competencies: {
        'Data Science & ML': 85,
        'Web Development': 75,
      },
      interests: ['AI', 'Machine Learning', 'Next.js'],
      experience_level: 'intermediate',
      overall_score: 82,
    },
    interest_weights: {
      ai: 5.0,
      python: 4.0,
      web: 3.0,
    },
    saved_hackathon_ids: ['h-saved-1', 'h-saved-2'],
    saved_hackathon_tags: ['ai', 'python', 'machine-learning'],
    recent_search_queries: ['ai hackathon', 'python machine learning'],
    viewed_hackathon_ids: ['h-100'],
    dismissed_hackathon_ids: [],
    registered_hackathon_ids: [],
    feedback: {},
    preferred_mode: 'online',
    preferred_tags: ['ai', 'python', 'pytorch', 'nextjs', 'web'],
    preferred_experience_range: ['intermediate', 'advanced'],
    user_city: 'San Francisco',
    user_country: 'USA',
    ...overrides,
  };
}

console.log('\n====================================================');
console.log('RUNNING RECOMMENDATION ENGINE V2 VERIFICATION SUITE');
console.log('====================================================\n');

// 1. Determinism and Stability
const ctx = createMockContext();
const hack = createMockHackathon();
const baseRun = scoreHackathon(hack, ctx, ['h-100'], ['user-similar-1']);

for (let i = 0; i < 50; i++) {
  const current = scoreHackathon(hack, ctx, ['h-100'], ['user-similar-1']);
  assert.strictEqual(
    current.final_score,
    baseRun.final_score,
    `Run ${i}: final_score should be strictly deterministic`
  );
  assert.strictEqual(
    current.raw_score,
    baseRun.raw_score,
    `Run ${i}: raw_score should be strictly deterministic`
  );
  assert.deepStrictEqual(
    current.signal_breakdown,
    baseRun.signal_breakdown,
    `Run ${i}: signal_breakdown must be identical`
  );
}
console.log('  ✓ 1. Determinism: 50 consecutive runs produce bit-for-bit identical scores');

// 2. Score Bounds
assert(baseRun.final_score >= 0 && baseRun.final_score <= 100, 'Score must be clamped in [0, 100]');
assert(MAX_POSITIVE_SCORE === 148, `MAX_POSITIVE_SCORE must equal 148, got ${MAX_POSITIVE_SCORE}`);
console.log('  ✓ 2. Score Bounds: Final score is clamped to [0, 100], MAX_POSITIVE_SCORE is 148');

// 3. Signal Cap Enforcement
const breakdown = baseRun.signal_breakdown;
assert(breakdown.language_match <= SIGNALS.LANGUAGE_MATCH.max, 'language_match within cap');
assert(breakdown.experience_match <= SIGNALS.EXPERIENCE_MATCH.max, 'experience_match within cap');
assert(breakdown.domain_competency <= SIGNALS.DOMAIN_COMPETENCY.max, 'domain_competency within cap');
assert(breakdown.interest_alignment <= SIGNALS.INTEREST_ALIGNMENT.max, 'interest_alignment within cap');
assert(breakdown.collaborative_filter <= SIGNALS.COLLABORATIVE_FILTER.max, 'collaborative_filter within cap');
assert(breakdown.saved_similar <= SIGNALS.SAVED_SIMILAR.max, 'saved_similar within cap');
assert(breakdown.search_intent <= SIGNALS.SEARCH_INTENT.max, 'search_intent within cap');
assert(breakdown.view_history <= SIGNALS.VIEW_HISTORY.max, 'view_history within cap');
assert(breakdown.deadline_urgency <= SIGNALS.DEADLINE_URGENCY.max, 'deadline_urgency within cap');
assert(breakdown.location_match <= SIGNALS.LOCATION_MATCH.max, 'location_match within cap');
assert(breakdown.mode_preference <= SIGNALS.MODE_PREFERENCE.max, 'mode_preference within cap');
assert(breakdown.hackathon_quality <= SIGNALS.HACKATHON_QUALITY.max, 'hackathon_quality within cap');
assert(breakdown.organizer_reputation <= SIGNALS.ORGANIZER_REPUTATION.max, 'organizer_reputation within cap');
assert(breakdown.prize_relevance <= SIGNALS.PRIZE_RELEVANCE.max, 'prize_relevance within cap');
console.log('  ✓ 3. Signal Caps: Every individual positive signal strictly respects its maximum cap');

// 4. Cold-Start / Null Profile Handling
const coldContext = createMockContext({
  developer_profile: null,
  interest_weights: {},
  saved_hackathon_ids: [],
  saved_hackathon_tags: [],
  recent_search_queries: [],
  viewed_hackathon_ids: [],
  feedback: {},
});
const coldScored = scoreHackathon(hack, coldContext, [], []);
assert(coldScored.final_score > 0, 'New user without profile still gets non-zero score from quality/urgency/organizer');
assert.strictEqual(coldScored.signal_breakdown.language_match, 0, 'Language match must be 0 for null profile');
assert.strictEqual(coldScored.signal_breakdown.domain_competency, 0, 'Domain competency must be 0 for null profile');
assert(coldScored.signal_breakdown.hackathon_quality > 0, 'Quality signal contributes for cold start');
assert(coldScored.signal_breakdown.deadline_urgency > 0, 'Deadline urgency contributes for cold start');
console.log('  ✓ 4. Cold Start: Gracefully handles null developer_profile and empty history with non-zero trending score');

// 5. Negative Signals & Penalties
const dismissedContext = createMockContext({
  dismissed_hackathon_ids: ['h-100'],
});
const dismissedScored = scoreHackathon(hack, dismissedContext, [], []);
assert(dismissedScored.signal_breakdown.penalties <= -50, 'Dismissed hackathon must receive -50 penalty');
assert(dismissedScored.final_score < baseRun.final_score, 'Dismissed hackathon score must be significantly suppressed');

const feedbackContext = createMockContext({
  feedback: { 'h-100': 'not_interested' },
});
const feedbackScored = scoreHackathon(hack, feedbackContext, [], []);
assert(feedbackScored.signal_breakdown.penalties <= -30, 'Not interested feedback must receive -30 penalty');
console.log('  ✓ 5. Penalties: Explicit dismissal and negative feedback suppress scores predictably');

// 6. Explanations
assert(Array.isArray(baseRun.explanations) && baseRun.explanations.length > 0, 'Explanations array populated');
assert(typeof baseRun.recommendation_reason === 'string' && baseRun.recommendation_reason.length > 0, 'Recommendation reason string present');
console.log(`  ✓ 6. Explanations: Generated human-readable reason: "${baseRun.recommendation_reason}"`);

console.log('\n====================================================');
console.log('ALL V2 RECOMMENDATION ENGINE TESTS PASSED (6/6)');
console.log('====================================================\n');
