import { DeveloperCapabilityProfile } from '../value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../value-objects/hackathon-capability-profile';
import { CANONICAL_SKILL_TAXONOMY } from '../skills/skill-taxonomy';
import { TeamGapEngine } from './team-gap-engine';
import {
  TeamCompatibilityResultDTO,
  TeamCoverageItemDTO,
  TeammateCandidateDTO
} from '@/types';

export class TeamCompatibilityEngine {
  /**
   * Evaluates team compatibility and capability coverage against hackathon requirements.
   */
  public static calculateTeamFit(
    hackathon: HackathonCapabilityProfile,
    teamMembers: DeveloperCapabilityProfile[]
  ): TeamCompatibilityResultDTO {
    if (!teamMembers || teamMembers.length === 0) {
      return {
        teamFitScore: 0,
        confidence: 'low',
        confidenceScore: 0,
        requiredCoverageScore: 0,
        preferredCoverageScore: 0,
        roleCoverageScore: 0,
        complementarityScore: 0,
        redundancyPenalty: 0,
        coveredSkills: [],
        criticalGaps: [],
        importantGaps: [],
        optionalGaps: [],
        explanationCodes: ['TEAM_EMPTY'],
        roleBreakdown: { frontend: 0, backend: 0, aiMl: 0, data: 0, devops: 0 }
      };
    }

    const coveredSkillsMap = new Map<string, TeamCoverageItemDTO>();
    const explanationCodes: string[] = [];

    // 1. Required Coverage Calculation
    let reqScore = 0.5; // Baseline when no mandatory languages required
    const reqLangs = hackathon.requiredLanguages;
    if (reqLangs.length > 0) {
      let sumProf = 0;
      for (const langId of reqLangs) {
        const coveredUsers: string[] = [];
        let maxProf = 0;
        for (const member of teamMembers) {
          const p = member.languages[langId] || 0;
          if (p > 0.25) {
            coveredUsers.push(member.userId);
            maxProf = Math.max(maxProf, p);
          }
        }
        sumProf += maxProf;
        const meta = CANONICAL_SKILL_TAXONOMY[langId];
        coveredSkillsMap.set(langId, {
          skillId: langId,
          displayLabel: meta?.displayLabel || langId,
          category: 'language',
          proficiency: Math.round(maxProf * 100) / 100,
          coverageLevel: maxProf >= 0.6 ? 'strong' : (maxProf > 0 ? 'partial' : 'missing'),
          coveredByUsers: coveredUsers
        });
      }
      reqScore = sumProf / reqLangs.length;
    } else {
      reqScore = 0.75;
    }

    // 2. Preferred Coverage Calculation
    let prefScore = 0.5;
    const prefLangs = hackathon.preferredLanguages;
    if (prefLangs.length > 0) {
      let sumPref = 0;
      for (const prefId of prefLangs) {
        const coveredUsers: string[] = [];
        let maxProf = 0;
        for (const member of teamMembers) {
          const p = (member.languages[prefId] || member.frameworks[prefId] || 0);
          if (p > 0.2) {
            coveredUsers.push(member.userId);
            maxProf = Math.max(maxProf, p);
          }
        }
        sumPref += maxProf;
        const meta = CANONICAL_SKILL_TAXONOMY[prefId];
        if (!coveredSkillsMap.has(prefId)) {
          coveredSkillsMap.set(prefId, {
            skillId: prefId,
            displayLabel: meta?.displayLabel || prefId,
            category: 'framework',
            proficiency: Math.round(maxProf * 100) / 100,
            coverageLevel: maxProf >= 0.5 ? 'strong' : (maxProf > 0 ? 'partial' : 'missing'),
            coveredByUsers: coveredUsers
          });
        }
      }
      prefScore = sumPref / prefLangs.length;
    } else {
      prefScore = 0.70;
    }

    // 3. Role Coverage
    const frontendScore = Math.min(1.0, Math.max(...teamMembers.map(m =>
      Math.max(
        m.languages['language.typescript'] || 0,
        m.languages['language.javascript'] || 0,
        m.frameworks['framework.react'] || 0,
        m.frameworks['framework.nextjs'] || 0,
        m.frameworks['framework.vue'] || 0
      )
    ), 0));

    const backendScore = Math.min(1.0, Math.max(...teamMembers.map(m =>
      Math.max(
        m.frameworks['framework.nodejs'] || 0,
        m.frameworks['framework.express'] || 0,
        m.frameworks['framework.fastapi'] || 0,
        m.frameworks['framework.django'] || 0,
        m.languages['language.go'] || 0,
        m.languages['language.rust'] || 0,
        m.domains['domain.backend'] || 0
      )
    ), 0));

    const aiMlScore = Math.min(1.0, Math.max(...teamMembers.map(m =>
      Math.max(
        m.domains['domain.ai_ml'] || 0,
        m.frameworks['framework.pytorch'] || 0,
        m.frameworks['framework.tensorflow'] || 0
      )
    ), 0));

    const dataScore = Math.min(1.0, Math.max(...teamMembers.map(m =>
      Math.max(
        m.skills['database.postgresql'] || 0,
        m.skills['database.mongodb'] || 0,
        m.domains['domain.data'] || 0
      )
    ), 0));

    const devopsScore = Math.min(1.0, Math.max(...teamMembers.map(m =>
      Math.max(
        m.skills['cloud_devops.docker'] || 0,
        m.skills['cloud_devops.kubernetes'] || 0,
        m.domains['domain.devops'] || 0
      )
    ), 0));

    const roleBreakdown = {
      frontend: Math.round(frontendScore * 100) / 100,
      backend: Math.round(backendScore * 100) / 100,
      aiMl: Math.round(aiMlScore * 100) / 100,
      data: Math.round(dataScore * 100) / 100,
      devops: Math.round(devopsScore * 100) / 100
    };

    // Calculate active role coverage based on hackathon tracks
    const activeRoles = [frontendScore, backendScore];
    if (hackathon.domains.includes('domain.ai_ml') || hackathon.rawTags.some(t => t.toLowerCase().includes('ai'))) {
      activeRoles.push(aiMlScore);
    }
    if (hackathon.domains.includes('domain.devops') || hackathon.domains.includes('domain.data')) {
      activeRoles.push(dataScore, devopsScore);
    }
    const roleCoverageScore = activeRoles.reduce((sum, r) => sum + r, 0) / activeRoles.length;

    // 4. Complementarity & Redundancy
    // Check role diversity: How many distinct roles have >= 0.4 coverage?
    const coveredRolesCount = [frontendScore, backendScore, aiMlScore, dataScore, devopsScore].filter(s => s >= 0.4).length;
    const complementarityScore = Math.min(1.0, 0.4 + (coveredRolesCount * 0.15));

    // Redundancy penalty: If team size >= 3 and 100% of members only have 1 single role and zero others
    let redundancyPenalty = 0;
    if (teamMembers.length >= 3 && coveredRolesCount <= 1) {
      redundancyPenalty = 0.10;
      explanationCodes.push('HIGH_ROLE_REDUNDANCY');
    }

    // 5. Gap Analysis
    const { criticalGaps, importantGaps, optionalGaps } = TeamGapEngine.evaluateGaps(hackathon, teamMembers);
    if (criticalGaps.length > 0) {
      explanationCodes.push('CRITICAL_GAPS_DETECTED');
    }

    // 6. Overall Weighted Team Fit Score
    const rawFit =
      (reqScore * 0.35) +
      (prefScore * 0.20) +
      (roleCoverageScore * 0.25) +
      (complementarityScore * 0.20) -
      redundancyPenalty;

    const teamFitScore = Math.max(0, Math.min(100, Math.round(rawFit * 100)));

    // 7. Team Confidence (Average of member technical confidences)
    const avgConfidenceScore = teamMembers.reduce((sum, m) => sum + m.confidenceScore, 0) / teamMembers.length;
    
    // Check sparse hackathon or sparse team evidence
    const isSparseHackathon = hackathon.requiredLanguages.length === 0 &&
      hackathon.preferredLanguages.length === 0 &&
      hackathon.frameworks.length === 0 &&
      hackathon.domains.length === 0;

    const totalEvidenceCount = teamMembers.reduce((sum, m) => sum + (m.evidenceCount || 0), 0);
    const isSparseTeam = teamMembers.length > 0 && totalEvidenceCount === 0;

    if (isSparseHackathon) {
      explanationCodes.push('SPARSE_HACKATHON_REQUIREMENTS');
    }
    if (isSparseTeam) {
      explanationCodes.push('SPARSE_TEAM_EVIDENCE');
    }

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (!isSparseHackathon && !isSparseTeam) {
      if (avgConfidenceScore >= 0.65) confidence = 'high';
      else if (avgConfidenceScore >= 0.35) confidence = 'medium';
    }

    return {
      teamFitScore,
      confidence,
      confidenceScore: Math.round(avgConfidenceScore * 100) / 100,
      requiredCoverageScore: Math.round(reqScore * 100) / 100,
      preferredCoverageScore: Math.round(prefScore * 100) / 100,
      roleCoverageScore: Math.round(roleCoverageScore * 100) / 100,
      complementarityScore: Math.round(complementarityScore * 100) / 100,
      redundancyPenalty: Math.round(redundancyPenalty * 100) / 100,
      coveredSkills: Array.from(coveredSkillsMap.values()),
      criticalGaps,
      importantGaps,
      optionalGaps,
      explanationCodes,
      roleBreakdown
    };
  }

  /**
   * Evaluates the marginal contribution of a candidate developer to an existing team.
   */
  public static evaluateCandidateContribution(
    hackathon: HackathonCapabilityProfile,
    currentMembers: DeveloperCapabilityProfile[],
    candidate: DeveloperCapabilityProfile,
    connectionState: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none',
    invitationState: 'none' | 'pending' | 'accepted' | 'not_allowed' = 'none'
  ): TeammateCandidateDTO {
    const baseline = this.calculateTeamFit(hackathon, currentMembers);
    const combined = this.calculateTeamFit(hackathon, [...currentMembers, candidate]);

    const addsSkills: string[] = [];
    const fillsGaps: string[] = [];
    const reasons: string[] = [];

    // Identify which skills candidate adds
    for (const [langId, score] of Object.entries(candidate.languages)) {
      if (score > 0.3) {
        const teamMax = Math.max(...currentMembers.map(m => m.languages[langId] || 0), 0);
        if (score > teamMax + 0.2) {
          const meta = CANONICAL_SKILL_TAXONOMY[langId];
          addsSkills.push(meta?.displayLabel || langId);
        }
      }
    }

    for (const [fwId, score] of Object.entries(candidate.frameworks)) {
      if (score > 0.3) {
        const teamMax = Math.max(...currentMembers.map(m => m.frameworks[fwId] || 0), 0);
        if (score > teamMax + 0.2) {
          const meta = CANONICAL_SKILL_TAXONOMY[fwId];
          addsSkills.push(meta?.displayLabel || fwId);
        }
      }
    }

    // Identify which gaps candidate fills
    for (const gap of baseline.criticalGaps) {
      const candidateProf = candidate.languages[gap.skillId] || candidate.frameworks[gap.skillId] || candidate.domains[gap.skillId] || 0;
      if (candidateProf >= 0.3 || (gap.skillId === 'domain.ai_ml' && (candidate.domains['domain.ai_ml'] || 0) > 0.3)) {
        fillsGaps.push(`Fills critical ${gap.displayLabel} gap`);
      }
    }

    for (const gap of baseline.importantGaps) {
      const candidateProf = candidate.languages[gap.skillId] || candidate.frameworks[gap.skillId] || candidate.domains[gap.skillId] || 0;
      if (candidateProf >= 0.3) {
        fillsGaps.push(`Strengthens ${gap.displayLabel}`);
      }
    }

    // Explainable reasons
    if (fillsGaps.length > 0) {
      reasons.push(fillsGaps[0]);
    }

    if (baseline.roleBreakdown.frontend >= 0.5 && (candidate.frameworks['framework.nodejs'] || candidate.domains['domain.backend'])) {
      reasons.push('Balances frontend team with backend & API architectural strength');
    }

    if (candidate.dsaIndex >= 0.6) {
      reasons.push(`Strong algorithmic problem solving (${Math.round(candidate.dsaIndex * 100)}% verified)`);
    }

    if (reasons.length === 0) {
      reasons.push('Verified general development background compatible with hackathon track');
    }

    // Marginal contribution score:
    // Pure technical delta + gap resolution weight + candidate technical depth (Zero fake connection bonuses)
    const delta = combined.teamFitScore - baseline.teamFitScore;
    const gapBonus = fillsGaps.length * 15;
    const rawContribution = Math.max(10, Math.min(99, 50 + (delta * 1.5) + gapBonus + (candidate.confidenceScore * 10)));

    return {
      userId: candidate.userId,
      displayName: 'Developer',
      avatarUrl: null,
      contributionScore: Math.round(rawContribution),
      confidence: candidate.confidence,
      technicalLevel: candidate.technicalLevel,
      addsSkills: addsSkills.slice(0, 4),
      fillsGaps: fillsGaps.slice(0, 3),
      reasons: reasons.slice(0, 3),
      connectionState,
      invitationState
    };
  }
}
