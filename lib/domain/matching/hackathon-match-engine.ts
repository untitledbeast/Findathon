import { DeveloperCapabilityProfile } from '../value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../value-objects/hackathon-capability-profile';
import { EligibilityEngine, EligibilityResult } from './eligibility-engine';
import { CANONICAL_SKILL_TAXONOMY } from '../skills/skill-taxonomy';

export interface MatchReason {
  type: 'language' | 'framework' | 'domain' | 'dsa' | 'experience' | 'general' | 'location' | 'preference';
  label: string;
  text: string;
  weight: number;
}

export interface MatchGap {
  type: 'missing_language' | 'missing_framework' | 'missing_domain' | 'level';
  label: string;
  suggestion: string;
}

export interface DimensionScores {
  skillMatch: number;
  languageMatch: number;
  domainMatch: number;
  frameworkMatch: number;
  technicalLevelMatch: number;
  dsaMatch: number;
  actionabilityMatch: number;
  locationMatch?: number;
  preferenceMatch?: number;
  intentMatch?: number;
}

/**
 * Versioned Recommendation Feature Model (GATE 15).
 * Exposes clean, explicit features for recommendation ranking.
 */
export interface RecommendationFeatures {
  capabilityMatch: number;        // 0.0 - 1.0 technical fit
  capabilityConfidence: number;   // 0.0 - 1.0 reliability of capability profile
  preferenceMatch: number;        // 0.0 - 1.0 explicit declared user interests
  intentMatch: number;            // 0.0 - 1.0 current search & filter session intent
  contextualMatch: number;        // 0.0 - 1.0 surface and contextual relevance
  locationMatch: number;          // 0.0 - 1.0 geographic relevance (1.0 for online)
  actionability: number;          // 0.0 - 1.0 deadline proximity & registration status
  freshness: number;              // 0.0 - 1.0 recency of user evidence
  dataQuality: number;            // 0.0 - 1.0 quality of hackathon structured data
  growthRelevance: number;        // 0.0 - 1.0 challenge headroom for skill stretch
}

/**
 * Context for personalization signals (GATES 8, 9, 10, 11).
 */
export interface RecommendationMatchContext {
  userInterests?: string[];          // GATE 8: Explicit user interests (preference, NOT capability)
  userPreferences?: {                // GATE 9: Minimal preference model
    domains?: string[];
    technologies?: string[];
    preferredMode?: 'online' | 'in-person' | 'both';
    preferredLocations?: string[];
    travelToleranceKm?: number;
  };
  currentQuery?: string;             // GATE 10: Current search query
  activeFilters?: {                  // GATE 10: Current filters
    mode?: 'online' | 'in-person';
    domain?: string;
    tags?: string[];
  };
  userLocation?: {                   // GATE 11: Location intelligence
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  currentSurface?: string;           // 'search' | 'recommendations' | 'explore'
}

export interface HackathonMatchResult {
  hackathonId: string;
  hackathonTitle: string;
  overallScore: number;         // 0.00 to 1.00
  matchPercentage: number;       // 0 to 100
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;       // 0.00 to 1.00
  dimensionScores: DimensionScores;
  strengths: MatchReason[];
  gaps: MatchGap[];
  eligibility: EligibilityResult;
  taxonomyVersion: string;
  scoringVersion: string;
  features?: RecommendationFeatures;
  recommendationMode?: 'COLD_START' | 'LIGHT_PERSONALIZATION' | 'FULL_PERSONALIZATION';
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class HackathonMatchEngine {
  public static readonly SCORING_VERSION = '1.5.0';

  // Dimension Weights (Sum = 1.0)
  public static readonly WEIGHTS = {
    SKILL: 0.30,
    LANGUAGE: 0.20,
    DOMAIN: 0.20,
    FRAMEWORK: 0.10,
    TECHNICAL_LEVEL: 0.10,
    DSA: 0.05,
    ACTIONABILITY: 0.05
  };

  /**
   * V1 DETERMINISTIC CONTROL BASELINE (RECOMMENDATION_V1_DETERMINISTIC).
   * Kept permanently available as the comparative control baseline.
   */
  public static calculateMatchV1(
    developer: DeveloperCapabilityProfile,
    hackathon: HackathonCapabilityProfile,
    eligibilityOverride?: EligibilityResult,
    now = Date.now()
  ): HackathonMatchResult {
    const eligibility = eligibilityOverride || EligibilityEngine.evaluate(hackathon, now);

    const strengths: MatchReason[] = [];
    const gaps: MatchGap[] = [];

    // 1. Language Alignment (0..1)
    let languageScore = 0.5;
    const reqLanguages = hackathon.requiredLanguages;
    const prefLanguages = hackathon.preferredLanguages;

    if (reqLanguages.length > 0) {
      let sumProficiency = 0;
      for (const langId of reqLanguages) {
        const proficiency = developer.languages[langId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[langId];
        const display = meta ? meta.displayLabel : langId;

        if (proficiency > 0.3) {
          sumProficiency += proficiency;
          strengths.push({
            type: 'language',
            label: display,
            text: `Verified ${display} proficiency (${Math.round(proficiency * 100)}%)`,
            weight: proficiency
          });
        } else {
          gaps.push({
            type: 'missing_language',
            label: display,
            suggestion: `Event highlights ${display}`
          });
        }
      }

      const fulfillmentRatio = sumProficiency / reqLanguages.length;
      languageScore = fulfillmentRatio;

      if (fulfillmentRatio > 0 && prefLanguages && prefLanguages.length > 0) {
        for (const prefLangId of prefLanguages) {
          const prefProf = developer.languages[prefLangId] || 0;
          if (prefProf > 0.3) {
            const meta = CANONICAL_SKILL_TAXONOMY[prefLangId];
            const display = meta ? meta.displayLabel : prefLangId;
            const bonus = prefProf * 0.15 * fulfillmentRatio;
            languageScore = Math.min(1.0, languageScore + bonus);
            strengths.push({
              type: 'language',
              label: display,
              text: `Preferred stack bonus for ${display}`,
              weight: bonus
            });
          }
        }
      }
    } else if (prefLanguages && prefLanguages.length > 0) {
      let sumPref = 0;
      let matchedCount = 0;
      for (const prefLangId of prefLanguages) {
        const prefProf = developer.languages[prefLangId] || 0;
        if (prefProf > 0.3) {
          sumPref += prefProf;
          matchedCount++;
          const meta = CANONICAL_SKILL_TAXONOMY[prefLangId];
          const display = meta ? meta.displayLabel : prefLangId;
          strengths.push({
            type: 'language',
            label: display,
            text: `Proficiency in ${display}`,
            weight: prefProf
          });
        }
      }
      languageScore = matchedCount > 0 ? Math.min(1.0, 0.5 + (sumPref / prefLanguages.length) * 0.5) : 0.5;
    } else {
      const devLangCount = Object.keys(developer.languages).length;
      if (devLangCount > 0) {
        const topDevLang = Object.entries(developer.languages).sort((a, b) => b[1] - a[1])[0];
        const meta = CANONICAL_SKILL_TAXONOMY[topDevLang[0]];
        languageScore = 0.7;
        strengths.push({
          type: 'language',
          label: meta?.displayLabel || 'Polyglot',
          text: `Strong coding foundation in ${meta?.displayLabel || 'multiple languages'}`,
          weight: 0.7
        });
      }
    }

    // 2. Framework Alignment (0..1)
    let frameworkScore = 0.5;
    const reqFrameworks = hackathon.frameworks;
    if (reqFrameworks.length > 0) {
      let sumFw = 0;
      for (const fwId of reqFrameworks) {
        const prof = developer.frameworks[fwId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[fwId];
        const display = meta ? meta.displayLabel : fwId;

        if (prof > 0.3) {
          sumFw += prof;
          strengths.push({
            type: 'framework',
            label: display,
            text: `Strong experience with ${display}`,
            weight: prof
          });
        } else {
          gaps.push({
            type: 'missing_framework',
            label: display,
            suggestion: `Build project utilizing ${display}`
          });
        }
      }
      frameworkScore = sumFw / reqFrameworks.length;
    } else if (Object.keys(developer.frameworks).length > 0) {
      frameworkScore = 0.65;
    }

    // 3. General Skill & Concept Alignment (0..1)
    let skillScore = 0.5;
    const reqSkills = hackathon.skills;
    if (reqSkills.length > 0) {
      let sumSkills = 0;
      for (const skId of reqSkills) {
        const prof = developer.skills[skId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[skId];
        const display = meta ? meta.displayLabel : skId;
        if (prof > 0.25) {
          sumSkills += prof;
          strengths.push({
            type: 'general',
            label: display,
            text: `Proficiency in ${display}`,
            weight: prof
          });
        }
      }
      skillScore = sumSkills / reqSkills.length;
    } else {
      skillScore = 0.60;
    }

    // 4. Domain & Category Relevance (0..1)
    let domainScore = 0.5;
    const hackDomains = hackathon.domains;
    if (hackDomains.length > 0) {
      let sumDom = 0;
      for (const domId of hackDomains) {
        const prof = developer.domains[domId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[domId];
        const display = meta ? meta.displayLabel : domId;

        if (prof > 0.25) {
          sumDom += prof;
          strengths.push({
            type: 'domain',
            label: display,
            text: `Relevant domain background in ${display}`,
            weight: prof
          });
        }
      }
      domainScore = sumDom / hackDomains.length;
    } else {
      domainScore = 0.6;
    }

    // 5. Technical Level Compatibility (0..1)
    let technicalLevelScore = 0.7;
    const hackDiff = hackathon.difficulty;
    const devLevel = developer.technicalLevel;

    if (hackDiff === 'open' || !hackDiff) {
      technicalLevelScore = 0.85;
    } else if (hackDiff === 'beginner') {
      technicalLevelScore = 1.0;
      strengths.push({
        type: 'experience',
        label: 'Accessible',
        text: 'Great fit for all developer experience levels',
        weight: 0.8
      });
    } else if (hackDiff === 'intermediate') {
      technicalLevelScore = (devLevel === 'intermediate' || devLevel === 'advanced') ? 0.95 : 0.60;
    } else if (hackDiff === 'advanced') {
      technicalLevelScore = devLevel === 'advanced' ? 1.0 : (devLevel === 'intermediate' ? 0.65 : 0.35);
      if (devLevel === 'beginner') {
        gaps.push({
          type: 'level',
          label: 'Advanced Track',
          suggestion: 'High-complexity event targeted for experienced builders'
        });
      }
    }

    // 6. DSA & Problem Solving Alignment (0..1)
    let dsaScore = 0.5;
    if (developer.dsaIndex > 0.4) {
      dsaScore = developer.dsaIndex;
      strengths.push({
        type: 'dsa',
        label: 'Algorithmic Problem Solving',
        text: `Strong problem-solving foundation (${Math.round(developer.dsaIndex * 100)}%)`,
        weight: developer.dsaIndex
      });
    }

    // 7. Actionability (0..1)
    const actionabilityScore = eligibility.actionability;

    // Weighted Overall Score
    let rawScore =
      (languageScore * this.WEIGHTS.LANGUAGE) +
      (frameworkScore * this.WEIGHTS.FRAMEWORK) +
      (skillScore * this.WEIGHTS.SKILL) +
      (domainScore * this.WEIGHTS.DOMAIN) +
      (technicalLevelScore * this.WEIGHTS.TECHNICAL_LEVEL) +
      (dsaScore * this.WEIGHTS.DSA) +
      (actionabilityScore * this.WEIGHTS.ACTIONABILITY);

    if (developer.evidenceCount === 0) {
      rawScore = Math.min(0.40, rawScore);
    }

    const overallScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 100) / 100));
    const matchPercentage = Math.round(overallScore * 100);

    let confidenceScore = developer.confidenceScore;
    if (hackathon.dataQuality === 'low') {
      confidenceScore = Math.round(confidenceScore * 0.7 * 100) / 100;
    }
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (confidenceScore >= 0.65) confidence = 'high';
    else if (confidenceScore >= 0.35) confidence = 'medium';

    return {
      hackathonId: hackathon.id,
      hackathonTitle: hackathon.title,
      overallScore,
      matchPercentage,
      confidence,
      confidenceScore,
      dimensionScores: {
        skillMatch: Math.round(skillScore * 100) / 100,
        frameworkMatch: Math.round(frameworkScore * 100) / 100,
        languageMatch: Math.round(languageScore * 100) / 100,
        domainMatch: Math.round(domainScore * 100) / 100,
        technicalLevelMatch: Math.round(technicalLevelScore * 100) / 100,
        dsaMatch: Math.round(dsaScore * 100) / 100,
        actionabilityMatch: Math.round(actionabilityScore * 100) / 100
      },
      strengths: strengths.slice(0, 4),
      gaps: gaps.slice(0, 3),
      eligibility,
      taxonomyVersion: developer.taxonomyVersion,
      scoringVersion: '1.0.0'
    };
  }

  /**
   * V1.5 ACCURACY-IMPROVED MATCHING ENGINE (GATE 15, 8, 9, 10, 11, 4).
   * Incorporates observation semantics, location intelligence, explicit user interests,
   * current intent signals, and versioned features.
   */
  public static calculateMatch(
    developer: DeveloperCapabilityProfile,
    hackathon: HackathonCapabilityProfile,
    eligibilityOverride?: EligibilityResult,
    now = Date.now(),
    context?: RecommendationMatchContext
  ): HackathonMatchResult {
    const eligibility = eligibilityOverride || EligibilityEngine.evaluate(hackathon, now);

    const strengths: MatchReason[] = [];
    const gaps: MatchGap[] = [];

    // 1. Language Alignment (0..1)
    let languageScore = 0.5; // Neutral baseline when hackathon requires no explicit languages
    const reqLanguages = hackathon.requiredLanguages;
    const prefLanguages = hackathon.preferredLanguages;

    if (reqLanguages.length > 0) {
      let sumProficiency = 0;

      for (const langId of reqLanguages) {
        const proficiency = developer.languages[langId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[langId];
        const display = meta ? meta.displayLabel : langId;
        const skillRec = developer.getSkill(langId);

        if (proficiency > 0.3) {
          sumProficiency += proficiency;
          strengths.push({
            type: 'language',
            label: display,
            text: `Verified ${display} proficiency (${Math.round(proficiency * 100)}%)`,
            weight: proficiency
          });
        } else {
          // GATE 4: Truthful observation semantics — not observed != absent
          const suggestionText = skillRec.observationState === 'NOT_OBSERVED'
            ? `Event requires ${display} (not yet observed in connected profiles)`
            : `Event highlights ${display}`;
          gaps.push({
            type: 'missing_language',
            label: display,
            suggestion: suggestionText
          });
        }
      }

      const fulfillmentRatio = sumProficiency / reqLanguages.length;
      languageScore = fulfillmentRatio;

      // Bonus for matched preferred languages only applies if mandatory required languages are fulfilled
      if (fulfillmentRatio > 0 && prefLanguages && prefLanguages.length > 0) {
        for (const prefLangId of prefLanguages) {
          const prefProf = developer.languages[prefLangId] || 0;
          if (prefProf > 0.3) {
            const meta = CANONICAL_SKILL_TAXONOMY[prefLangId];
            const display = meta ? meta.displayLabel : prefLangId;
            const bonus = prefProf * 0.15 * fulfillmentRatio;
            languageScore = Math.min(1.0, languageScore + bonus);
            strengths.push({
              type: 'language',
              label: display,
              text: `Preferred stack bonus for ${display}`,
              weight: bonus
            });
          }
        }
      }
    } else if (prefLanguages && prefLanguages.length > 0) {
      let sumPref = 0;
      let matchedCount = 0;
      for (const prefLangId of prefLanguages) {
        const prefProf = developer.languages[prefLangId] || 0;
        if (prefProf > 0.3) {
          sumPref += prefProf;
          matchedCount++;
          const meta = CANONICAL_SKILL_TAXONOMY[prefLangId];
          const display = meta ? meta.displayLabel : prefLangId;
          strengths.push({
            type: 'language',
            label: display,
            text: `Proficiency in ${display}`,
            weight: prefProf
          });
        }
      }
      languageScore = matchedCount > 0 ? Math.min(1.0, 0.5 + (sumPref / prefLanguages.length) * 0.5) : 0.5;
    } else {
      const devLangCount = Object.keys(developer.languages).length;
      if (devLangCount > 0) {
        const topDevLang = Object.entries(developer.languages).sort((a, b) => b[1] - a[1])[0];
        const meta = CANONICAL_SKILL_TAXONOMY[topDevLang[0]];
        languageScore = 0.7;
        strengths.push({
          type: 'language',
          label: meta?.displayLabel || 'Polyglot',
          text: `Strong coding foundation in ${meta?.displayLabel || 'multiple languages'}`,
          weight: 0.7
        });
      }
    }

    // 2. Framework Alignment (0..1)
    let frameworkScore = 0.5;
    const reqFrameworks = hackathon.frameworks;
    if (reqFrameworks.length > 0) {
      let sumFw = 0;
      for (const fwId of reqFrameworks) {
        const prof = developer.frameworks[fwId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[fwId];
        const display = meta ? meta.displayLabel : fwId;
        const skillRec = developer.getSkill(fwId);

        if (prof > 0.3) {
          sumFw += prof;
          strengths.push({
            type: 'framework',
            label: display,
            text: `Strong experience with ${display}`,
            weight: prof
          });
        } else {
          // GATE 4: Truthful observation semantics
          const suggestion = skillRec.observationState === 'NOT_OBSERVED'
            ? `Build project utilizing ${display} (not yet observed in connected profiles)`
            : `Build project utilizing ${display}`;
          gaps.push({
            type: 'missing_framework',
            label: display,
            suggestion
          });
        }
      }
      frameworkScore = sumFw / reqFrameworks.length;
    } else if (Object.keys(developer.frameworks).length > 0) {
      frameworkScore = 0.65;
    }

    // 3. General Skill & Concept Alignment (0..1)
    let skillScore = 0.5;
    const reqSkills = hackathon.skills;
    if (reqSkills.length > 0) {
      let sumSkills = 0;
      for (const skId of reqSkills) {
        const prof = developer.skills[skId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[skId];
        const display = meta ? meta.displayLabel : skId;
        if (prof > 0.25) {
          sumSkills += prof;
          strengths.push({
            type: 'general',
            label: display,
            text: `Proficiency in ${display}`,
            weight: prof
          });
        }
      }
      skillScore = sumSkills / reqSkills.length;
    } else {
      skillScore = 0.60;
    }

    // 4. Domain & Category Relevance (0..1)
    let domainScore = 0.5;
    const hackDomains = hackathon.domains;
    if (hackDomains.length > 0) {
      let sumDom = 0;
      for (const domId of hackDomains) {
        const prof = developer.domains[domId] || 0;
        const meta = CANONICAL_SKILL_TAXONOMY[domId];
        const display = meta ? meta.displayLabel : domId;

        if (prof > 0.25) {
          sumDom += prof;
          strengths.push({
            type: 'domain',
            label: display,
            text: `Relevant domain background in ${display}`,
            weight: prof
          });
        }
      }
      domainScore = sumDom / hackDomains.length;
    } else {
      domainScore = 0.6;
    }

    // 5. Technical Level Compatibility (0..1)
    let technicalLevelScore = 0.7;
    const hackDiff = hackathon.difficulty;
    const devLevel = developer.technicalLevel;

    if (hackDiff === 'open' || !hackDiff) {
      technicalLevelScore = 0.85;
    } else if (hackDiff === 'beginner') {
      technicalLevelScore = 1.0;
      strengths.push({
        type: 'experience',
        label: 'Accessible',
        text: 'Great fit for all developer experience levels',
        weight: 0.8
      });
    } else if (hackDiff === 'intermediate') {
      technicalLevelScore = (devLevel === 'intermediate' || devLevel === 'advanced') ? 0.95 : 0.60;
    } else if (hackDiff === 'advanced') {
      technicalLevelScore = devLevel === 'advanced' ? 1.0 : (devLevel === 'intermediate' ? 0.65 : 0.35);
      if (devLevel === 'beginner') {
        gaps.push({
          type: 'level',
          label: 'Advanced Track',
          suggestion: 'High-complexity event targeted for experienced builders'
        });
      }
    }

    // 6. DSA & Problem Solving Alignment (0..1)
    let dsaScore = 0.5;
    if (developer.dsaIndex > 0.4) {
      dsaScore = developer.dsaIndex;
      strengths.push({
        type: 'dsa',
        label: 'Algorithmic Problem Solving',
        text: `Strong problem-solving foundation (${Math.round(developer.dsaIndex * 100)}%)`,
        weight: developer.dsaIndex
      });
    }

    // 7. Actionability (0..1)
    const actionabilityScore = eligibility.actionability;

    // Weighted Overall Capability Score
    let rawScore =
      (languageScore * this.WEIGHTS.LANGUAGE) +
      (frameworkScore * this.WEIGHTS.FRAMEWORK) +
      (skillScore * this.WEIGHTS.SKILL) +
      (domainScore * this.WEIGHTS.DOMAIN) +
      (technicalLevelScore * this.WEIGHTS.TECHNICAL_LEVEL) +
      (dsaScore * this.WEIGHTS.DSA) +
      (actionabilityScore * this.WEIGHTS.ACTIONABILITY);

    if (developer.evidenceCount === 0) {
      rawScore = Math.min(0.40, rawScore);
    }

    const capabilityMatchScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 100) / 100));

    // GATE 11: Location Intelligence
    let locationScore = 1.0; // Online events default to 1.0 (zero physical penalty)
    if (!hackathon.isOnline) {
      const userLoc = context?.userLocation;
      if (userLoc?.latitude != null && userLoc?.longitude != null && hackathon.latitude != null && hackathon.longitude != null) {
        const distanceKm = calculateHaversineDistanceKm(
          userLoc.latitude,
          userLoc.longitude,
          hackathon.latitude,
          hackathon.longitude
        );
        const travelTol = context?.userPreferences?.travelToleranceKm || 150;
        if (distanceKm <= 50) {
          locationScore = 1.0;
        } else if (distanceKm <= travelTol) {
          locationScore = 0.85;
        } else if (distanceKm <= 500) {
          locationScore = 0.60;
        } else {
          locationScore = 0.30;
        }
        if (locationScore >= 0.85) {
          strengths.push({
            type: 'location',
            label: 'Proximity',
            text: `In-person event located ${Math.round(distanceKm)} km from you`,
            weight: locationScore
          });
        }
      } else if (userLoc?.city && hackathon.locationCity && 
                 userLoc.city.toLowerCase().trim() === hackathon.locationCity.toLowerCase().trim()) {
        locationScore = 1.0;
        strengths.push({
          type: 'location',
          label: 'City Match',
          text: `In-person event in your city (${hackathon.locationCity})`,
          weight: 1.0
        });
      } else {
        // Unknown location: neutral 0.70 without fabricating coordinates
        locationScore = 0.70;
      }
    }

    // GATES 8, 9: Explicit User Interests & Minimal Preferences (Personalization NOT Capability)
    let preferenceScore = 0.50;
    const declaredInterests = [
      ...(context?.userInterests || []),
      ...(context?.userPreferences?.domains || []),
      ...(context?.userPreferences?.technologies || [])
    ];
    if (declaredInterests.length > 0) {
      const hackathonCorpus = [
        ...hackathon.domains,
        ...hackathon.frameworks,
        ...hackathon.requiredLanguages,
        ...hackathon.preferredLanguages,
        ...hackathon.rawTags,
        hackathon.title
      ].map(s => s.toLowerCase());

      const matched = declaredInterests.filter(int => {
        const low = int.toLowerCase().trim();
        return hackathonCorpus.some(h => h.includes(low));
      });

      if (matched.length > 0) {
        preferenceScore = Math.min(1.0, 0.60 + (matched.length * 0.20));
        strengths.push({
          type: 'preference',
          label: 'Declared Interest',
          text: `Aligns with your declared interest in ${matched.slice(0, 2).join(' & ')}`,
          weight: preferenceScore
        });
      } else {
        preferenceScore = 0.40;
      }
    }

    // GATE 10: Current Search / Intent Signal
    let intentScore = 0.50;
    if (context?.currentQuery) {
      const q = context.currentQuery.toLowerCase().trim();
      const titleMatch = hackathon.title.toLowerCase().includes(q);
      const tagMatch = hackathon.rawTags.some(t => t.toLowerCase().includes(q));
      const descMatch = hackathon.description.toLowerCase().includes(q);
      if (titleMatch || tagMatch) intentScore = 1.0;
      else if (descMatch) intentScore = 0.80;
      else intentScore = 0.30;
    }
    if (context?.activeFilters) {
      if (context.activeFilters.mode) {
        const modeMatches = (context.activeFilters.mode === 'online' && hackathon.isOnline) ||
          (context.activeFilters.mode === 'in-person' && !hackathon.isOnline);
        if (!modeMatches) intentScore = Math.min(intentScore, 0.20);
      }
      if (context.activeFilters.domain && context.activeFilters.domain !== 'all') {
        const d = context.activeFilters.domain.toLowerCase();
        const domMatches = hackathon.domains.some(dom => dom.toLowerCase().includes(d)) ||
          hackathon.rawTags.some(tag => tag.toLowerCase().includes(d));
        if (domMatches) intentScore = Math.min(1.0, intentScore + 0.30);
        else intentScore = Math.min(intentScore, 0.30);
      }
    }

    // GATE 12: Deterministic Cold-Start Intelligence State
    let recommendationMode: 'COLD_START' | 'LIGHT_PERSONALIZATION' | 'FULL_PERSONALIZATION' = 'COLD_START';
    const hasPreferences = declaredInterests.length > 0;
    const hasEvidence = developer.evidenceCount > 0;
    const sourceCount = developer.sources.length;

    if (!hasEvidence && !hasPreferences) {
      recommendationMode = 'COLD_START';
    } else if (sourceCount >= 2 && developer.evidenceCount >= 3) {
      recommendationMode = 'FULL_PERSONALIZATION';
    } else {
      recommendationMode = 'LIGHT_PERSONALIZATION';
    }

    // Overall Score blending: if context is provided, personalize contextually while preserving capability foundation
    let overallScore = capabilityMatchScore;
    if (context && (declaredInterests.length > 0 || context.currentQuery || context.activeFilters || context.userLocation)) {
      const contextualScore = 
        (capabilityMatchScore * 0.70) + 
        (preferenceScore * 0.15) + 
        (locationScore * 0.10) + 
        (intentScore * 0.05);
      overallScore = Math.max(0.0, Math.min(1.0, Math.round(contextualScore * 100) / 100));
    }

    const matchPercentage = Math.round(overallScore * 100);

    // Dynamic confidence (GATE 16)
    let confidenceScore = developer.confidenceScore;
    if (hackathon.dataQuality === 'low') {
      confidenceScore = Math.round(confidenceScore * 0.7 * 100) / 100;
    }
    if (recommendationMode === 'COLD_START') {
      confidenceScore = Math.min(0.30, confidenceScore);
    }
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (confidenceScore >= 0.65) confidence = 'high';
    else if (confidenceScore >= 0.35) confidence = 'medium';

    // Versioned Features (GATE 15)
    const features: RecommendationFeatures = {
      capabilityMatch: capabilityMatchScore,
      capabilityConfidence: developer.confidenceScore,
      preferenceMatch: Math.round(preferenceScore * 100) / 100,
      intentMatch: Math.round(intentScore * 100) / 100,
      contextualMatch: Math.round(((preferenceScore * 0.5) + (intentScore * 0.5)) * 100) / 100,
      locationMatch: Math.round(locationScore * 100) / 100,
      actionability: Math.round(actionabilityScore * 100) / 100,
      freshness: developer.evidenceCount > 0 ? 0.90 : 0.50,
      dataQuality: hackathon.dataQuality === 'high' ? 1.0 : hackathon.dataQuality === 'medium' ? 0.70 : 0.40,
      growthRelevance: technicalLevelScore < 1.0 ? 0.80 : 0.50
    };

    return {
      hackathonId: hackathon.id,
      hackathonTitle: hackathon.title,
      overallScore,
      matchPercentage,
      confidence,
      confidenceScore,
      dimensionScores: {
        skillMatch: Math.round(skillScore * 100) / 100,
        frameworkMatch: Math.round(frameworkScore * 100) / 100,
        languageMatch: Math.round(languageScore * 100) / 100,
        domainMatch: Math.round(domainScore * 100) / 100,
        technicalLevelMatch: Math.round(technicalLevelScore * 100) / 100,
        dsaMatch: Math.round(dsaScore * 100) / 100,
        actionabilityMatch: Math.round(actionabilityScore * 100) / 100,
        locationMatch: Math.round(locationScore * 100) / 100,
        preferenceMatch: Math.round(preferenceScore * 100) / 100,
        intentMatch: Math.round(intentScore * 100) / 100
      },
      strengths: strengths.slice(0, 4),
      gaps: gaps.slice(0, 3),
      eligibility,
      taxonomyVersion: developer.taxonomyVersion,
      scoringVersion: this.SCORING_VERSION,
      features,
      recommendationMode
    };
  }
}
