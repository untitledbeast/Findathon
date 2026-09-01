import {
  DeveloperSkillSnapshot,
  TeamFitResult,
  TeammateRecommendation
} from './types';

export function computeTeamFit(
  team: { required_skills: string[]; max_members: number },
  members: DeveloperSkillSnapshot[]
): TeamFitResult {
  const coveredDomains = new Set<string>();
  const coveredLanguages = new Set<string>();

  for (const member of members) {
    if (member.competencies && typeof member.competencies === 'object') {
      for (const [domain, score] of Object.entries(member.competencies)) {
        if (typeof score === 'number' && score >= 30) {
          coveredDomains.add(domain);
        }
      }
    }

    if (Array.isArray(member.top_languages)) {
      for (const lang of member.top_languages) {
        if (typeof lang === 'string' && lang.trim().length > 0) {
          coveredLanguages.add(lang.trim());
        }
      }
    }
  }

  const covered_skills = Array.from(
    new Set([...coveredDomains, ...coveredLanguages])
  ).sort((a, b) => a.localeCompare(b));

  const required_skills = Array.isArray(team.required_skills) ? team.required_skills : [];

  const gap_skills = required_skills.filter(
    (skill) =>
      !covered_skills.some(
        (c) =>
          c.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(c.toLowerCase())
      )
  );

  let score = 0;
  if (required_skills.length === 0) {
    score = Math.min(100, members.length * 25);
  } else {
    const filledRatio = (required_skills.length - gap_skills.length) / required_skills.length;
    const maxMembers = team.max_members > 0 ? team.max_members : 4;
    const memberRatio = Math.min(1, members.length / maxMembers);
    score = Math.round((filledRatio * 0.7 + memberRatio * 0.3) * 100);
  }

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (score >= 80) {
    confidence = 'high';
  } else if (score >= 50) {
    confidence = 'medium';
  }

  const reasons: string[] = [];
  for (const skill of required_skills) {
    if (!gap_skills.includes(skill)) {
      reasons.push(`Team covers ${skill}`);
    }
  }
  for (const skill of gap_skills) {
    reasons.push(`Missing ${skill} expertise`);
  }
  if (score >= 80) {
    reasons.push('Strong team composition');
  }

  return {
    score,
    confidence,
    covered_skills,
    gap_skills,
    reasons
  };
}

export function recommendTeammates(
  currentUser: DeveloperSkillSnapshot | null | undefined,
  teamFit: TeamFitResult,
  candidates: DeveloperSkillSnapshot[]
): TeammateRecommendation[] {
  const userCompetencies = currentUser?.competencies || {};
  const userInterests = Array.isArray(currentUser?.interests) ? currentUser.interests : [];

  const recommendations: TeammateRecommendation[] = [];

  for (const candidate of candidates) {
    const candidateLanguages = Array.isArray(candidate.top_languages) ? candidate.top_languages : [];
    const candidateCompetencies = candidate.competencies && typeof candidate.competencies === 'object'
      ? candidate.competencies
      : {};
    const candidateInterests = Array.isArray(candidate.interests) ? candidate.interests : [];

    // 1. Gap fill score (0-50 points)
    const fillsLanguages = candidateLanguages.filter((lang) =>
      teamFit.gap_skills.some(
        (gap) =>
          gap.toLowerCase().includes(lang.toLowerCase()) ||
          lang.toLowerCase().includes(gap.toLowerCase())
      )
    );

    const fillsCompetencyDomains = Object.keys(candidateCompetencies).filter(
      (domain) =>
        (candidateCompetencies[domain] || 0) >= 30 &&
        teamFit.gap_skills.some(
          (gap) =>
            gap.toLowerCase().includes(domain.toLowerCase()) ||
            domain.toLowerCase().includes(gap.toLowerCase())
        )
    );

    const fills_gaps = Array.from(new Set([...fillsLanguages, ...fillsCompetencyDomains]));
    const gapScore = Math.min(50, fills_gaps.length * 15);

    // 2. Competency complement score (0-30 points)
    let complementScore = 0;
    for (const [domain, score] of Object.entries(candidateCompetencies)) {
      const userScore = typeof userCompetencies[domain] === 'number' ? userCompetencies[domain] : 0;
      if (typeof score === 'number' && score >= 40 && userScore < 30) {
        complementScore += 8;
      }
    }
    complementScore = Math.min(30, complementScore);

    // 3. Interests overlap score (0-20 points)
    const sharedInterests = candidateInterests.filter((i) => userInterests.includes(i));
    const interestScore = Math.min(20, sharedInterests.length * 5);

    // 4. Match score
    const match_score = Math.min(100, gapScore + complementScore + interestScore);

    // 5. Adds skills
    const adds_skills = candidateLanguages.slice(0, 3);

    // 6. Match label
    const match_label = `${match_score}% match`;

    if (match_score >= 10) {
      recommendations.push({
        developer: candidate,
        match_score,
        fills_gaps,
        adds_skills,
        match_label
      });
    }
  }

  // Sort descending by match_score
  recommendations.sort((a, b) => b.match_score - a.match_score);

  return recommendations.slice(0, 10);
}
