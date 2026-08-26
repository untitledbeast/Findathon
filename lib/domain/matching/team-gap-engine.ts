import { DeveloperCapabilityProfile } from '../value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../value-objects/hackathon-capability-profile';
import { CANONICAL_SKILL_TAXONOMY } from '../skills/skill-taxonomy';
import { TeamGapDTO } from '@/types';

export class TeamGapEngine {
  /**
   * Deterministically evaluates unfilled capability gaps for a team against hackathon requirements.
   */
  public static evaluateGaps(
    hackathon: HackathonCapabilityProfile,
    teamMembers: DeveloperCapabilityProfile[]
  ): {
    criticalGaps: TeamGapDTO[];
    importantGaps: TeamGapDTO[];
    optionalGaps: TeamGapDTO[];
  } {
    const criticalGaps: TeamGapDTO[] = [];
    const importantGaps: TeamGapDTO[] = [];
    const optionalGaps: TeamGapDTO[] = [];

    // 1. Evaluate Required Languages
    for (const langId of hackathon.requiredLanguages) {
      const maxProf = teamMembers.reduce((max, m) => Math.max(max, m.languages[langId] || 0), 0);
      const meta = CANONICAL_SKILL_TAXONOMY[langId];
      const label = meta ? meta.displayLabel : langId;

      if (maxProf < 0.3) {
        criticalGaps.push({
          skillId: langId,
          displayLabel: label,
          category: 'language',
          severity: 'critical',
          reason: `No verified proficiency in mandatory event language: ${label}`
        });
      } else if (maxProf < 0.6) {
        importantGaps.push({
          skillId: langId,
          displayLabel: label,
          category: 'language',
          severity: 'important',
          reason: `Team has basic ${label} proficiency (${Math.round(maxProf * 100)}%), but stronger depth is recommended`
        });
      }
    }

    // 2. Evaluate Required Frameworks & Domains
    for (const fwId of hackathon.frameworks) {
      const maxProf = teamMembers.reduce((max, m) => Math.max(max, m.frameworks[fwId] || 0), 0);
      const meta = CANONICAL_SKILL_TAXONOMY[fwId];
      const label = meta ? meta.displayLabel : fwId;

      if (maxProf < 0.25) {
        importantGaps.push({
          skillId: fwId,
          displayLabel: label,
          category: 'framework',
          severity: 'important',
          reason: `Event highlights ${label}, but team lacks specialized framework coverage`
        });
      }
    }

    for (const domId of hackathon.domains) {
      const maxProf = teamMembers.reduce((max, m) => Math.max(max, m.domains[domId] || 0), 0);
      const meta = CANONICAL_SKILL_TAXONOMY[domId];
      const label = meta ? meta.displayLabel : domId;

      if (maxProf < 0.25) {
        // Domain is critical if it's the primary track
        const isPrimary = hackathon.domains[0] === domId;
        const targetList = isPrimary ? criticalGaps : importantGaps;
        targetList.push({
          skillId: domId,
          displayLabel: label,
          category: 'domain',
          severity: isPrimary ? 'critical' : 'important',
          reason: `Uncovered track focus in ${label}`
        });
      }
    }

    // 3. Evaluate Preferred Languages
    for (const prefId of hackathon.preferredLanguages) {
      if (hackathon.requiredLanguages.includes(prefId)) continue;
      const maxProf = teamMembers.reduce((max, m) => Math.max(max, m.languages[prefId] || 0), 0);
      const meta = CANONICAL_SKILL_TAXONOMY[prefId];
      const label = meta ? meta.displayLabel : prefId;

      if (maxProf < 0.2) {
        optionalGaps.push({
          skillId: prefId,
          displayLabel: label,
          category: 'language',
          severity: 'optional',
          reason: `Preferred stack includes ${label}`
        });
      }
    }

    // 4. Evaluate Core Role Coverage (Frontend, Backend, AI/ML)
    const hasFrontend = teamMembers.some(m =>
      (m.languages['language.typescript'] || 0) > 0.3 ||
      (m.languages['language.javascript'] || 0) > 0.3 ||
      (m.frameworks['framework.react'] || 0) > 0.3 ||
      (m.frameworks['framework.nextjs'] || 0) > 0.3
    );

    const hasBackend = teamMembers.some(m =>
      (m.frameworks['framework.nodejs'] || 0) > 0.3 ||
      (m.frameworks['framework.express'] || 0) > 0.3 ||
      (m.frameworks['framework.fastapi'] || 0) > 0.3 ||
      (m.frameworks['framework.django'] || 0) > 0.3 ||
      (m.languages['language.go'] || 0) > 0.3 ||
      (m.languages['language.rust'] || 0) > 0.3 ||
      (m.domains['domain.backend'] || 0) > 0.3
    );

    const isAiTrack = hackathon.domains.includes('domain.ai_ml') || hackathon.rawTags.some(t => t.toLowerCase().includes('ai') || t.toLowerCase().includes('ml'));
    const hasAi = teamMembers.some(m => (m.domains['domain.ai_ml'] || 0) > 0.3 || (m.frameworks['framework.pytorch'] || 0) > 0.3);

    if (isAiTrack && !hasAi && !criticalGaps.some(g => g.skillId === 'domain.ai_ml')) {
      criticalGaps.push({
        skillId: 'domain.ai_ml',
        displayLabel: 'AI / Machine Learning',
        category: 'domain',
        severity: 'critical',
        reason: 'Event has an AI/ML focus, but the team lacks dedicated AI/ML modeling skills'
      });
    }

    if (!hasFrontend && teamMembers.length > 0 && !importantGaps.some(g => g.skillId === 'role.frontend')) {
      importantGaps.push({
        skillId: 'role.frontend',
        displayLabel: 'Frontend Engineering',
        category: 'role',
        severity: 'important',
        reason: 'No dedicated UI / Frontend builder to deliver the presentation layer'
      });
    }

    if (!hasBackend && teamMembers.length > 0 && !importantGaps.some(g => g.skillId === 'role.backend')) {
      importantGaps.push({
        skillId: 'role.backend',
        displayLabel: 'Backend Engineering',
        category: 'role',
        severity: 'important',
        reason: 'No dedicated Backend / API architect to handle database and services'
      });
    }

    return {
      criticalGaps: criticalGaps.slice(0, 5),
      importantGaps: importantGaps.slice(0, 5),
      optionalGaps: optionalGaps.slice(0, 5)
    };
  }
}
