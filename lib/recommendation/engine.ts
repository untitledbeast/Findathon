/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — CORE SCORING ENGINE
 *
 * Pure function: inputs in, score out, same every time.
 * No side effects, no DB calls, no randomness.
 * Every signal is capped at its defined maximum.
 * Every score is guaranteed to be in [0, 100].
 * ====================================================================
 */

import { SIGNALS, MAX_POSITIVE_SCORE } from './signals';
import type {
  UserSignalContext,
  HackathonScoringInput,
  ScoredHackathon,
  SignalBreakdown,
  ConfidenceLevel,
} from './types';

// ── Domain Tag Map ──────────────────────────────────────────────────
// Maps high-level competency domains to lowercase keyword aliases.
// Used by SIGNAL 3 (Domain Competency) to match hackathon tags to
// the user's declared competencies in developer_profiles.

const DOMAIN_TAG_MAP: Record<string, string[]> = {
  'Web Development': [
    'web', 'frontend', 'backend', 'react', 'nextjs', 'nodejs', 'fullstack',
    'api', 'html', 'css', 'javascript', 'typescript', 'vue', 'angular',
    'svelte', 'express', 'django', 'flask', 'rails',
  ],
  'Mobile Development': [
    'mobile', 'android', 'ios', 'flutter', 'react-native', 'swift', 'kotlin',
    'xamarin', 'cordova',
  ],
  'Data Science & ML': [
    'ai', 'ml', 'machine-learning', 'data-science', 'python', 'tensorflow',
    'pytorch', 'nlp', 'computer-vision', 'deep-learning', 'llm', 'data',
    'analytics', 'pandas', 'scikit',
  ],
  'Blockchain & Web3': [
    'web3', 'blockchain', 'solidity', 'ethereum', 'solana', 'defi', 'nft',
    'crypto', 'smart-contract', 'dao',
  ],
  'Cloud & DevOps': [
    'cloud', 'devops', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
    'ci-cd', 'terraform', 'serverless',
  ],
  'Cybersecurity': [
    'security', 'cybersecurity', 'ctf', 'hacking', 'cryptography',
    'penetration', 'infosec',
  ],
  'Game Development': [
    'game', 'unity', 'unreal', 'godot', 'gamedev', 'ar', 'vr', 'xr',
  ],
  'Problem Solving': [
    'algorithms', 'data-structures', 'competitive', 'dsa', 'math',
    'competitive-programming',
  ],
  'Open Source': [
    'open-source', 'library', 'framework', 'tool', 'cli', 'oss',
  ],
  'IoT & Robotics': [
    'iot', 'robotics', 'embedded', 'arduino', 'hardware', 'raspberry-pi',
  ],
};

// ── Known Premium Organizers ────────────────────────────────────────
// Used by SIGNAL 13 (Organizer Reputation) to identify trusted organizers.

const KNOWN_PREMIUM_ORGANIZERS: string[] = [
  'google', 'microsoft', 'aws', 'meta', 'mlh',
  'iit', 'nit', 'bits', 'iisc', 'mit', 'stanford',
  'github', 'devfolio', 'unstop', 'devpost',
  'hackerearth', 'codeforces', 'leetcode',
];

// ── Experience Level Mapping ────────────────────────────────────────
// Used by SIGNAL 2 (Experience Match) for numeric level comparison.

const EXPERIENCE_LEVELS: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  open: -1,      // open = any level welcome
};

// ====================================================================
// MAIN SCORING FUNCTION
// ====================================================================

/**
 * Scores a single hackathon against a user's full signal context.
 *
 * @param hackathon      - The hackathon to score (minimal DB projection)
 * @param context        - User's assembled signal context (identity + behavioral + preferences)
 * @param similarToSaved - Hackathon IDs similar to the user's saved hackathons
 * @param collaborativeUsers - User IDs with similar profiles who saved this hackathon
 * @returns ScoredHackathon with final_score in [0, 100]
 */
export function scoreHackathon(
  hackathon: HackathonScoringInput,
  context: UserSignalContext,
  similarToSaved: string[],
  collaborativeUsers: string[],
): ScoredHackathon {
  const explanations: string[] = [];
  const profile = context.developer_profile;

  // ── SIGNAL 1: LANGUAGE MATCH (max 25) ─────────────────────────────
  let languageScore = 0;
  const matchedLanguages: string[] = [];

  if (profile && profile.language_scores) {
    const techTerms = [...(hackathon.tags || []), ...(hackathon.tech_stack || [])]
      .map(t => t.toLowerCase());

    for (const [language, score] of Object.entries(profile.language_scores)) {
      const langLower = language.toLowerCase();
      if (techTerms.some(t => t === langLower || t.includes(langLower))) {
        // Score proportional to proficiency; cap contribution per language at ~8.3
        const contribution = (score / 100) * (SIGNALS.LANGUAGE_MATCH.max / 3);
        languageScore += contribution;
        matchedLanguages.push(language);
      }
    }
  }
  languageScore = Math.min(SIGNALS.LANGUAGE_MATCH.max, Math.round(languageScore));
  if (matchedLanguages.length > 0) {
    explanations.push(`Matches your ${matchedLanguages.slice(0, 2).join(' & ')} skills`);
  }

  // ── SIGNAL 2: EXPERIENCE MATCH (max 20) ───────────────────────────
  let experienceScore = 0;

  if (profile) {
    const hackathonLevel = EXPERIENCE_LEVELS[hackathon.difficulty?.toLowerCase() ?? ''] ?? -1;
    const userLevel = EXPERIENCE_LEVELS[profile.experience_level] ?? 0;

    if (hackathonLevel === -1) {
      // 'open' difficulty — always relevant but not perfect
      experienceScore = 15;
      explanations.push('Open to all experience levels');
    } else {
      const diff = Math.abs(hackathonLevel - userLevel);
      if (diff === 0) {
        experienceScore = SIGNALS.EXPERIENCE_MATCH.max; // 20
        explanations.push(`Perfect for ${profile.experience_level} developers`);
      } else if (diff === 1) {
        experienceScore = 8;
        explanations.push('One level from your experience range');
      } else {
        experienceScore = 0;
        // Two levels apart — EXPERIENCE_SEVERE_MISMATCH penalty applied below
      }
    }
  }

  // ── SIGNAL 3: DOMAIN COMPETENCY (max 20) ──────────────────────────
  let domainScore = 0;
  const matchedDomains: string[] = [];

  if (profile && profile.competencies) {
    const hackathonTagsLower = (hackathon.tags || []).map(t => t.toLowerCase());

    for (const [domain, keywords] of Object.entries(DOMAIN_TAG_MAP)) {
      const hasOverlap = hackathonTagsLower.some(t => keywords.includes(t));
      if (hasOverlap) {
        const userCompetencyScore = profile.competencies[domain] ?? 0;
        if (userCompetencyScore >= 20) {
          // Contribution proportional to user's competency; cap per domain at 10
          const contribution = (userCompetencyScore / 100) * (SIGNALS.DOMAIN_COMPETENCY.max / 2);
          domainScore += contribution;
          matchedDomains.push(domain);
        }
      }
    }
  }
  domainScore = Math.min(SIGNALS.DOMAIN_COMPETENCY.max, Math.round(domainScore));
  if (matchedDomains.length > 0) {
    explanations.push(`Aligns with your ${matchedDomains[0]} expertise`);
  }

  // ── SIGNAL 4: INTEREST ALIGNMENT (max 15) ─────────────────────────
  let interestScore = 0;
  const matchedInterests: string[] = [];

  for (const tag of (hackathon.tags || [])) {
    const tagLower = tag.toLowerCase();

    // Check explicit interest weights (from user_interests with decay)
    const userWeight = context.interest_weights[tagLower] ?? 0;

    // Check if tag in user interests array
    const inInterests = profile?.interests?.some(
      i => i.toLowerCase() === tagLower
    ) ?? false;

    // Check if tag in preferred_tags (top behavioral signals)
    const inPreferred = context.preferred_tags.some(
      p => p.toLowerCase() === tagLower
    );

    if (userWeight > 0) {
      // Weight range: 0.1–10.0, normalized to max 5 per tag
      const contribution = Math.min(5, (userWeight / 10) * 5);
      interestScore += contribution;
      matchedInterests.push(tag);
    } else if (inInterests || inPreferred) {
      interestScore += 2;
      matchedInterests.push(tag);
    }
  }
  interestScore = Math.min(SIGNALS.INTEREST_ALIGNMENT.max, Math.round(interestScore));
  if (matchedInterests.length > 0) {
    explanations.push(`Matches your interest in ${matchedInterests.slice(0, 2).join(', ')}`);
  }

  // ── SIGNAL 5: COLLABORATIVE FILTER (max 12) ──────────────────────
  const collabCount = collaborativeUsers.length;
  let collaborativeScore = 0;

  if (collabCount === 0) collaborativeScore = 0;
  else if (collabCount === 1) collaborativeScore = 3;
  else if (collabCount <= 3) collaborativeScore = 6;
  else if (collabCount <= 7) collaborativeScore = 9;
  else collaborativeScore = SIGNALS.COLLABORATIVE_FILTER.max; // 12

  if (collabCount > 0) {
    explanations.push(
      `${collabCount} developer${collabCount > 1 ? 's' : ''} with your profile saved this`
    );
  }

  // ── SIGNAL 6: SAVED SIMILAR (max 10) ──────────────────────────────
  let savedSimilarScore = 0;

  if (similarToSaved.includes(hackathon.id)) {
    savedSimilarScore = SIGNALS.SAVED_SIMILAR.max; // 10
    explanations.push("Similar to hackathons you've saved");
  }

  // ── SIGNAL 7: SEARCH INTENT (max 8) ──────────────────────────────
  let searchScore = 0;
  const recentSearches = context.recent_search_queries.slice(0, 10);

  for (const query of recentSearches) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const hackathonText = [
      hackathon.title,
      ...(hackathon.tags || []),
      hackathon.location_city ?? '',
    ].join(' ').toLowerCase();

    const matchCount = queryTerms.filter(
      term => term.length > 2 && hackathonText.includes(term)
    ).length;

    if (matchCount >= 2) {
      searchScore += 4;
    } else if (matchCount === 1) {
      searchScore += 2;
    }
  }
  searchScore = Math.min(SIGNALS.SEARCH_INTENT.max, searchScore);
  if (searchScore > 0) {
    explanations.push('Matches your recent searches');
  }

  // ── SIGNAL 8: VIEW HISTORY (max 5) ────────────────────────────────
  let viewScore = 0;
  let viewedSimilarCount = 0;

  // Check if user viewed hackathons that are similar to this one
  for (const viewedId of context.viewed_hackathon_ids) {
    if (similarToSaved.includes(viewedId)) {
      viewedSimilarCount++;
    }
  }

  if (viewedSimilarCount >= 3) viewScore = SIGNALS.VIEW_HISTORY.max; // 5
  else if (viewedSimilarCount >= 1) viewScore = 2;

  if (viewedSimilarCount > 0) {
    explanations.push('You explored similar events recently');
  }

  // ── SIGNAL 9: DEADLINE URGENCY (max 8) ────────────────────────────
  const now = Date.now();
  const deadlineStr = hackathon.registration_deadline ?? hackathon.start_date;
  const daysLeft = deadlineStr
    ? Math.ceil((new Date(deadlineStr).getTime() - now) / 86400000)
    : 999;

  let urgencyScore = 0;

  if (daysLeft < 0) {
    urgencyScore = 0; // closed
  } else if (daysLeft <= 1) {
    urgencyScore = SIGNALS.DEADLINE_URGENCY.max; // 8
  } else if (daysLeft <= 3) {
    urgencyScore = 6;
  } else if (daysLeft <= 7) {
    urgencyScore = 4;
  } else if (daysLeft <= 14) {
    urgencyScore = 2;
  } else {
    urgencyScore = 0; // plenty of time
  }

  if (urgencyScore >= 6) {
    explanations.push(
      `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to register`
    );
  } else if (urgencyScore >= 2) {
    explanations.push(`Registration closes in ${daysLeft} days`);
  }

  // ── SIGNAL 10: LOCATION MATCH (max 6) ─────────────────────────────
  let locationScore = 0;

  if (hackathon.is_online) {
    locationScore = 3; // online is always accessible
    if (context.preferred_mode === 'online') locationScore = SIGNALS.LOCATION_MATCH.max; // 6
    explanations.push('Accessible online from anywhere');
  } else {
    const cityMatch = context.user_city
      && hackathon.location_city
      && hackathon.location_city.toLowerCase().includes(context.user_city.toLowerCase());

    if (cityMatch) {
      locationScore = SIGNALS.LOCATION_MATCH.max; // 6
      explanations.push(`In your city (${hackathon.location_city})`);
    } else {
      locationScore = 0;
    }
  }

  // ── SIGNAL 11: MODE PREFERENCE (max 5) ────────────────────────────
  let modeScore = 0;
  const userPref = context.preferred_mode;

  if (userPref === 'no_preference') {
    modeScore = 3; // neutral
  } else if (userPref === 'online' && hackathon.is_online) {
    modeScore = SIGNALS.MODE_PREFERENCE.max; // 5
  } else if (userPref === 'offline' && !hackathon.is_online) {
    modeScore = SIGNALS.MODE_PREFERENCE.max; // 5
  } else if (userPref === 'online' && !hackathon.is_online) {
    modeScore = 0; // mismatch
  } else if (userPref === 'offline' && hackathon.is_online) {
    modeScore = 2; // partial mismatch
  }

  // ── SIGNAL 12: HACKATHON QUALITY (max 6) ──────────────────────────
  let qualityScore = 0;

  if ((hackathon.review_count ?? 0) >= 5) {
    const ratingScore = (((hackathon.avg_rating ?? 1) - 1) / 4) * 4;
    qualityScore += Math.max(0, Math.round(ratingScore));
  }

  if ((hackathon.engagement_score ?? 0) > 0) {
    const engagementBonus = Math.min(2, Math.round(hackathon.engagement_score * 2));
    qualityScore += engagementBonus;
  }
  qualityScore = Math.min(SIGNALS.HACKATHON_QUALITY.max, qualityScore);

  // ── SIGNAL 13: ORGANIZER REPUTATION (max 4) ──────────────────────
  let organizerScore = 1; // default: unknown organizer gets benefit of doubt
  const organizerLower = (hackathon.organizer || '').toLowerCase();

  if (KNOWN_PREMIUM_ORGANIZERS.some(o => organizerLower.includes(o))) {
    organizerScore = SIGNALS.ORGANIZER_REPUTATION.max; // 4
  } else if ((hackathon.review_count ?? 0) > 10) {
    organizerScore = 2; // proven history
  }

  // ── SIGNAL 14: PRIZE RELEVANCE (max 4) ────────────────────────────
  let prizeScore = 0;
  const userLevel = profile?.experience_level ?? 'beginner';
  const prizeAmount = hackathon.prize_amount ?? 0;

  if (userLevel === 'beginner') {
    if (prizeAmount > 0 && prizeAmount <= 50000) prizeScore = SIGNALS.PRIZE_RELEVANCE.max;
    else if (prizeAmount > 50000) prizeScore = 2; // big prize = stiff competition
    else prizeScore = 1;
  } else if (userLevel === 'intermediate') {
    if (prizeAmount >= 10000) prizeScore = SIGNALS.PRIZE_RELEVANCE.max;
    else if (prizeAmount > 0) prizeScore = 2;
    else prizeScore = 1;
  } else {
    // advanced
    if (prizeAmount >= 50000) prizeScore = SIGNALS.PRIZE_RELEVANCE.max;
    else if (prizeAmount >= 10000) prizeScore = 3;
    else if (prizeAmount > 0) prizeScore = 2;
    else prizeScore = 1;
  }

  // ── PENALTIES ─────────────────────────────────────────────────────
  let penalties = 0;

  // Dismissed hackathon
  if (context.dismissed_hackathon_ids.includes(hackathon.id)) {
    penalties += SIGNALS.ALREADY_DISMISSED.max; // -50
  }

  // Explicit feedback
  const userFeedback = context.feedback[hackathon.id];
  if (userFeedback === 'not_interested') {
    penalties += SIGNALS.FEEDBACK_NOT_INTERESTED.max; // -30
  } else if (userFeedback === 'too_advanced') {
    penalties += SIGNALS.FEEDBACK_TOO_ADVANCED.max; // -20
  } else if (userFeedback === 'too_basic') {
    penalties += SIGNALS.FEEDBACK_TOO_BASIC.max; // -20
  } else if (userFeedback === 'wrong_domain') {
    penalties += SIGNALS.FEEDBACK_WRONG_DOMAIN.max; // -25
  }

  // Registration closed
  if (daysLeft < 0) {
    penalties += SIGNALS.REGISTRATION_CLOSED.max; // -20
  }

  // Severe experience mismatch (2+ levels apart)
  if (profile) {
    const hackLevel = EXPERIENCE_LEVELS[hackathon.difficulty?.toLowerCase() ?? ''] ?? -1;
    const usrLevel = EXPERIENCE_LEVELS[profile.experience_level] ?? 0;
    if (hackLevel !== -1 && Math.abs(hackLevel - usrLevel) >= 2) {
      penalties += SIGNALS.EXPERIENCE_SEVERE_MISMATCH.max; // -15
    }
  }

  // ── FINAL SCORE CALCULATION ───────────────────────────────────────
  const signalBreakdown: SignalBreakdown = {
    language_match: languageScore,
    experience_match: experienceScore,
    domain_competency: domainScore,
    interest_alignment: interestScore,
    collaborative_filter: collaborativeScore,
    saved_similar: savedSimilarScore,
    search_intent: searchScore,
    view_history: viewScore,
    deadline_urgency: urgencyScore,
    location_match: locationScore,
    mode_preference: modeScore,
    hackathon_quality: qualityScore,
    organizer_reputation: organizerScore,
    prize_relevance: prizeScore,
    penalties,
  };

  const rawScore =
    languageScore +
    experienceScore +
    domainScore +
    interestScore +
    collaborativeScore +
    savedSimilarScore +
    searchScore +
    viewScore +
    urgencyScore +
    locationScore +
    modeScore +
    qualityScore +
    organizerScore +
    prizeScore +
    penalties;

  // Normalize to 0-100
  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round((rawScore / MAX_POSITIVE_SCORE) * 100))
  );

  // Confidence level based on how many signals contributed non-zero values
  const nonZeroCount = [
    languageScore, experienceScore, domainScore, interestScore,
    collaborativeScore, savedSimilarScore, searchScore, viewScore,
    urgencyScore, locationScore, modeScore, qualityScore,
    organizerScore, prizeScore,
  ].filter(v => v > 0).length;

  let confidence: ConfidenceLevel;
  if (nonZeroCount >= 8) confidence = 'very_high';
  else if (nonZeroCount >= 5) confidence = 'high';
  else if (nonZeroCount >= 3) confidence = 'medium';
  else confidence = 'low';

  // Pick the first non-empty explanation as the headline reason
  const filteredExplanations = explanations.filter(Boolean);
  const recommendationReason =
    filteredExplanations[0] ?? 'Trending in your area';

  return {
    hackathon,
    final_score: normalizedScore,
    raw_score: rawScore,
    signal_breakdown: signalBreakdown,
    explanations: filteredExplanations,
    confidence,
    recommendation_reason: recommendationReason,
  };
}
