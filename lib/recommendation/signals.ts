/**
 * ====================================================================
 * FINDATHON RECOMMENDATION ENGINE V2 — SIGNAL DEFINITIONS
 *
 * Every signal used in scoring is defined here with:
 *   - max: maximum points this signal can contribute
 *   - description: what the signal measures
 *   - comment: why this weight was chosen
 *
 * Total positive maximum = 148 raw points → normalized to 0-100
 * ====================================================================
 */

export const SIGNALS = {

  // ── IDENTITY SIGNALS (who is this developer?) ──────────────────────

  LANGUAGE_MATCH: {
    max: 25,
    description: 'Developer languages match hackathon tech stack',
    // Why 25: Technical fit is the most concrete measurable signal.
    // If you write Python and the hackathon requires Python, the match
    // is near-certain. This is the highest confidence signal we have.
  },

  EXPERIENCE_MATCH: {
    max: 20,
    description: 'Developer experience level matches hackathon difficulty',
    // Why 20: Mismatched difficulty = poor participation quality.
    // A beginner in an advanced hackathon will drop out.
    // An advanced developer in a beginner hackathon will disengage.
  },

  DOMAIN_COMPETENCY: {
    max: 20,
    description: 'Developer domain competencies overlap hackathon tags',
    // Why 20: Domain knowledge (Web Dev, AI/ML, etc.) is a proxy
    // for ability to contribute meaningfully to that hackathon's theme.
  },

  INTEREST_ALIGNMENT: {
    max: 15,
    description: 'User interest tags match hackathon tags (weighted)',
    // Why 15: Interests predict engagement. A developer interested
    // in blockchain who enters a blockchain hackathon will produce
    // better work and enjoy it more. Weighted by recency and strength.
  },

  // ── BEHAVIORAL SIGNALS (what has this user done?) ──────────────────

  COLLABORATIVE_FILTER: {
    max: 12,
    description: 'Developers with similar profiles saved this hackathon',
    // Why 12: If 10 developers with your exact skill profile saved
    // a hackathon, that is strong evidence it is relevant for you too.
    // This is the core of collaborative filtering — no ML needed,
    // just overlap counting.
  },

  SAVED_SIMILAR: {
    max: 10,
    description: 'User previously saved similar hackathons',
    // Why 10: Past saves are the ground truth of preference.
    // If you saved 3 AI hackathons, the 4th AI hackathon is almost
    // certainly relevant. Similarity computed via hackathon_similarity.
  },

  SEARCH_INTENT: {
    max: 8,
    description: 'Hackathon matches recent search queries',
    // Why 8: Search reveals immediate intent. If you searched for
    // "blockchain hackathon Mumbai" in the last 7 days, showing you
    // a blockchain hackathon in Mumbai is highly accurate.
    // Lower than saves because search intent is more transient.
  },

  VIEW_HISTORY: {
    max: 5,
    description: 'User previously viewed similar hackathon detail pages',
    // Why 5: Views are weaker than saves — they indicate curiosity
    // but not commitment. Still useful for understanding topic interest.
  },

  // ── CONTEXTUAL SIGNALS (right place, right time) ───────────────────

  DEADLINE_URGENCY: {
    max: 8,
    description: 'Registration deadline proximity drives timely awareness',
    // Why 8: A hackathon closing in 3 days deserves higher visibility
    // than one 3 months away, all else equal. Urgency matters.
    // NOT the highest signal — urgency without relevance is spam.
  },

  LOCATION_MATCH: {
    max: 6,
    description: 'Hackathon location matches user city/country',
    // Why 6: Location convenience increases participation likelihood.
    // Lower weight because online hackathons are equally accessible.
  },

  MODE_PREFERENCE: {
    max: 5,
    description: 'Online/offline preference based on user history',
    // Why 5: If a user has only ever saved/registered for online
    // hackathons, offline hackathons should be deprioritized for them.
    // Inferred from behavior, not asked explicitly.
  },

  // ── QUALITY SIGNALS (is this hackathon worth recommending?) ────────

  HACKATHON_QUALITY: {
    max: 6,
    description: 'Hackathon quality score from reviews and engagement',
    // Why 6: A well-reviewed hackathon with high engagement is
    // better to recommend than an unproven new one. But quality
    // should not overpower relevance — a mediocre hackathon that
    // perfectly matches your skills beats a great hackathon that
    // does not.
  },

  ORGANIZER_REPUTATION: {
    max: 4,
    description: 'Organizer track record across past events',
    // Why 4: Established organizers (Google, MLH, IIT clubs) deliver
    // better experiences. Small signal — new organizers deserve a chance.
  },

  PRIZE_RELEVANCE: {
    max: 4,
    description: 'Prize pool relative to hackathon type and user level',
    // Why 4: Users care about prizes but it should not dominate.
    // A beginner should not only see high-prize advanced hackathons.
  },

  // ── NEGATIVE SIGNALS (explicit downranking) ─────────────────────────

  ALREADY_DISMISSED: {
    max: -50,
    description: 'User explicitly dismissed this hackathon',
    // Effectively removes from recommendations
  },

  FEEDBACK_NOT_INTERESTED: {
    max: -30,
    description: 'User gave explicit "not interested" feedback',
  },

  FEEDBACK_TOO_ADVANCED: {
    max: -20,
    description: 'User said hackathon is too advanced for them',
  },

  FEEDBACK_TOO_BASIC: {
    max: -20,
    description: 'User said hackathon is too basic for them',
  },

  FEEDBACK_WRONG_DOMAIN: {
    max: -25,
    description: 'User said hackathon is in the wrong domain',
  },

  REGISTRATION_CLOSED: {
    max: -20,
    description: 'Registration deadline has passed',
  },

  EXPERIENCE_SEVERE_MISMATCH: {
    max: -15,
    description: 'Two or more experience levels apart — poor fit',
  },
} as const;

/**
 * Total maximum positive score achievable across all 14 positive signals.
 * Used for normalizing raw scores to 0-100 range.
 *
 * 25 + 20 + 20 + 15 + 12 + 10 + 8 + 5 + 8 + 6 + 5 + 6 + 4 + 4 = 148
 */
export const MAX_POSITIVE_SCORE: number =
  SIGNALS.LANGUAGE_MATCH.max +
  SIGNALS.EXPERIENCE_MATCH.max +
  SIGNALS.DOMAIN_COMPETENCY.max +
  SIGNALS.INTEREST_ALIGNMENT.max +
  SIGNALS.COLLABORATIVE_FILTER.max +
  SIGNALS.SAVED_SIMILAR.max +
  SIGNALS.SEARCH_INTENT.max +
  SIGNALS.VIEW_HISTORY.max +
  SIGNALS.DEADLINE_URGENCY.max +
  SIGNALS.LOCATION_MATCH.max +
  SIGNALS.MODE_PREFERENCE.max +
  SIGNALS.HACKATHON_QUALITY.max +
  SIGNALS.ORGANIZER_REPUTATION.max +
  SIGNALS.PRIZE_RELEVANCE.max;
// = 148
