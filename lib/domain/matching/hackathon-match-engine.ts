import { DeveloperCapabilityProfile } from '../value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../value-objects/hackathon-capability-profile';
import { EligibilityEngine, EligibilityResult } from './eligibility-engine';
import { CANONICAL_SKILL_TAXONOMY } from '../skills/skill-taxonomy';

export interface MatchReason {
  type: 'language' | 'framework' | 'domain' | 'dsa' | 'experience' | 'general';
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
}

export class HackathonMatchEngine {
  public static readonly SCORING_VERSION = '1.0.0';

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
   * Pure deterministic matching engine.
   * Compares DeveloperCapabilityProfile against HackathonCapabilityProfile.
   */
  public static calculateMatch(
    developer: DeveloperCapabilityProfile,
    hackathon: HackathonCapabilityProfile,
    eligibilityOverride?: EligibilityResult,
    now = Date.now()
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
      // Only preferred languages specified
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
      // If no explicit language specified, check if developer has any active languages
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

    // If developer has zero evidence, cap rawScore gracefully
    if (developer.evidenceCount === 0) {
      rawScore = Math.min(0.40, rawScore);
    }

    // Mathematical clamping to [0, 1]
    const overallScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 100) / 100));
    const matchPercentage = Math.round(overallScore * 100);

    // Dynamic confidence
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
      scoringVersion: this.SCORING_VERSION
    };
  }
}
