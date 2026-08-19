import { DeveloperProfileEntity, ExperienceLevel } from '../entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity, SkillEvidenceSource } from '../entities/developer-skill-evidence.entity';
import { SkillNormalizer } from '../skills/skill-normalizer';

export interface DeveloperCapabilityProfileProps {
  userId: string;
  languages: Record<string, number>;      // Canonical ID -> normalized score (0..1)
  frameworks: Record<string, number>;     // Canonical ID -> normalized score (0..1)
  domains: Record<string, number>;        // Canonical ID -> normalized score (0..1)
  skills: Record<string, number>;         // Canonical ID -> normalized score (0..1)
  dsaIndex: number;                       // Algorithmic competence (0..1)
  problemSolvingIndex: number;            // Math & problem solving competence (0..1)
  implementationIndex: number;            // Practical code delivery competence (0..1)
  technicalLevel: ExperienceLevel;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;                // Evidence robustness (0..1)
  evidenceCount: number;
  sources: SkillEvidenceSource[];
  interests: string[];
  taxonomyVersion: string;
  scoringVersion: string;
  lastVerifiedAt: number;
}

export class DeveloperCapabilityProfile {
  public static readonly TAXONOMY_VERSION = '1.0.0';
  public static readonly SCORING_VERSION = '1.0.0';

  constructor(private readonly props: DeveloperCapabilityProfileProps) {}

  public get userId(): string { return this.props.userId; }
  public get languages(): Record<string, number> { return { ...this.props.languages }; }
  public get frameworks(): Record<string, number> { return { ...this.props.frameworks }; }
  public get domains(): Record<string, number> { return { ...this.props.domains }; }
  public get skills(): Record<string, number> { return { ...this.props.skills }; }
  public get dsaIndex(): number { return this.props.dsaIndex; }
  public get problemSolvingIndex(): number { return this.props.problemSolvingIndex; }
  public get implementationIndex(): number { return this.props.implementationIndex; }
  public get technicalLevel(): ExperienceLevel { return this.props.technicalLevel; }
  public get confidence(): 'high' | 'medium' | 'low' { return this.props.confidence; }
  public get confidenceScore(): number { return this.props.confidenceScore; }
  public get evidenceCount(): number { return this.props.evidenceCount; }
  public get sources(): SkillEvidenceSource[] { return [...this.props.sources]; }
  public get interests(): string[] { return [...this.props.interests]; }
  public get taxonomyVersion(): string { return this.props.taxonomyVersion; }
  public get scoringVersion(): string { return this.props.scoringVersion; }
  public get lastVerifiedAt(): number { return this.props.lastVerifiedAt; }

  /**
   * Constructs an immutable, normalized capability profile from verified domain entities.
   */
  public static fromEvidence(
    userId: string,
    profileEntity: DeveloperProfileEntity | null,
    evidenceList: DeveloperSkillEvidenceEntity[],
    now = Date.now()
  ): DeveloperCapabilityProfile {
    const languages: Record<string, number> = {};
    const frameworks: Record<string, number> = {};
    const domains: Record<string, number> = {};
    const skills: Record<string, number> = {};
    const sourcesSet = new Set<SkillEvidenceSource>();
    const DAY_MS = 24 * 60 * 60 * 1000;

    let githubRepoCount = 0;
    let leetcodeTotalSolved = 0;
    let leetcodeMediumHard = 0;
    let leetcodeContestRating = 0;
    let totalEvidenceWeight = 0;

    for (const evidence of evidenceList) {
      sourcesSet.add(evidence.source);
      const timestamp = evidence.updatedAt || evidence.createdAt || now;
      const ageDays = Math.max(0, (now - timestamp) / DAY_MS);

      // Freshness factor
      let freshness = 0.3;
      if (ageDays < 90) freshness = 1.0;
      else if (ageDays < 180) freshness = 0.8;
      else if (ageDays < 365) freshness = 0.5;

      const sourceScale = evidence.source === 'leetcode' ? 0.7 : 1.0;
      const effectiveWeight = (evidence.weight || 1.0) * freshness * sourceScale;
      totalEvidenceWeight += effectiveWeight;

      const signals = evidence.signals || {};

      // Process GitHub Repo Evidence
      if (evidence.source === 'github') {
        if (evidence.evidenceType === 'repo') {
          githubRepoCount++;
        }

        // Primary Language
        if (typeof signals.language === 'string') {
          const canonical = SkillNormalizer.normalize(signals.language);
          if (canonical && canonical.category === 'language') {
            languages[canonical.id] = (languages[canonical.id] || 0) + effectiveWeight;
            if (canonical.parentDomain) {
              domains[canonical.parentDomain] = (domains[canonical.parentDomain] || 0) + (effectiveWeight * 0.6);
            }
          }
        }

        // Language byte breakdown
        if (signals.languages && typeof signals.languages === 'object') {
          for (const [langKey, bytes] of Object.entries(signals.languages)) {
            const canonical = SkillNormalizer.normalize(langKey);
            if (canonical && canonical.category === 'language') {
              const byteScale = typeof bytes === 'number' && bytes > 0
                ? Math.min(1.5, Math.max(0.5, Math.log10(bytes) / 4))
                : 1.0;
              languages[canonical.id] = (languages[canonical.id] || 0) + (effectiveWeight * byteScale);
            }
          }
        }

        // Repo Topics
        if (Array.isArray(signals.topics)) {
          for (const tag of signals.topics) {
            const canonical = SkillNormalizer.normalize(String(tag));
            if (canonical) {
              if (canonical.category === 'framework') {
                frameworks[canonical.id] = (frameworks[canonical.id] || 0) + effectiveWeight;
                if (canonical.parentDomain) {
                  domains[canonical.parentDomain] = (domains[canonical.parentDomain] || 0) + (effectiveWeight * 0.7);
                }
              } else if (canonical.category === 'domain') {
                domains[canonical.id] = (domains[canonical.id] || 0) + effectiveWeight;
              } else if (canonical.category === 'language') {
                languages[canonical.id] = (languages[canonical.id] || 0) + (effectiveWeight * 0.5);
                if (canonical.parentDomain) {
                  domains[canonical.parentDomain] = (domains[canonical.parentDomain] || 0) + (effectiveWeight * 0.5);
                }
              } else if (canonical.category === 'skill' || canonical.category === 'database' || canonical.category === 'cloud_devops') {
                skills[canonical.id] = (skills[canonical.id] || 0) + effectiveWeight;
                if (canonical.parentDomain) {
                  domains[canonical.parentDomain] = (domains[canonical.parentDomain] || 0) + (effectiveWeight * 0.5);
                }
              }
            }
          }
        }
      }

      // Process LeetCode Evidence
      if (evidence.source === 'leetcode') {
        if (evidence.evidenceType === 'activity') {
          if (typeof signals.totalSolved === 'number') {
            leetcodeTotalSolved = Math.max(leetcodeTotalSolved, signals.totalSolved);
            const med = Number(signals.mediumSolved) || 0;
            const hard = Number(signals.hardSolved) || 0;
            leetcodeMediumHard = Math.max(leetcodeMediumHard, med + hard);
          }
          if (typeof signals.contestRating === 'number') {
            leetcodeContestRating = Math.max(leetcodeContestRating, signals.contestRating);
          }
          if (signals.languageName && typeof signals.problemsSolved === 'number') {
            const canonical = SkillNormalizer.normalize(String(signals.languageName));
            if (canonical && canonical.category === 'language') {
              const countScale = Math.min(1.5, Math.max(0.5, Math.log10(signals.problemsSolved + 1)));
              languages[canonical.id] = (languages[canonical.id] || 0) + (effectiveWeight * countScale);
            }
          }
        }

        if (evidence.evidenceType === 'submission' && signals.tagSlug) {
          const canonical = SkillNormalizer.normalize(String(signals.tagSlug));
          if (canonical) {
            if (canonical.id === 'skill.dsa' || canonical.id === 'skill.problem_solving') {
              domains['domain.backend'] = (domains['domain.backend'] || 0) + effectiveWeight;
            } else if (canonical.category === 'domain') {
              domains[canonical.id] = (domains[canonical.id] || 0) + effectiveWeight;
            }
          }
        }
      }
    }

    // Normalize map scores into [0, 1] bounded ranges
    const maxLang = Math.max(...Object.values(languages), 1);
    const normalizedLanguages: Record<string, number> = {};
    for (const [k, v] of Object.entries(languages)) {
      normalizedLanguages[k] = Math.round((v / maxLang) * 1000) / 1000;
    }

    const maxFw = Math.max(...Object.values(frameworks), 1);
    const normalizedFrameworks: Record<string, number> = {};
    for (const [k, v] of Object.entries(frameworks)) {
      normalizedFrameworks[k] = Math.round((v / maxFw) * 1000) / 1000;
    }

    const maxDom = Math.max(...Object.values(domains), 1);
    const normalizedDomains: Record<string, number> = {};
    for (const [k, v] of Object.entries(domains)) {
      normalizedDomains[k] = Math.round((v / maxDom) * 1000) / 1000;
    }

    const maxSkills = Math.max(...Object.values(skills), 1);
    const normalizedSkills: Record<string, number> = {};
    for (const [k, v] of Object.entries(skills)) {
      normalizedSkills[k] = Math.round((v / maxSkills) * 1000) / 1000;
    }

    // Algorithmic Indices
    let dsaIndex = 0;
    if (leetcodeTotalSolved >= 500) dsaIndex = 0.95;
    else if (leetcodeTotalSolved >= 300) dsaIndex = 0.85;
    else if (leetcodeTotalSolved >= 100) dsaIndex = 0.65;
    else if (leetcodeTotalSolved >= 30) dsaIndex = 0.40;
    else if (leetcodeTotalSolved > 0) dsaIndex = 0.20;

    if (leetcodeContestRating >= 2000) dsaIndex = Math.max(dsaIndex, 0.98);
    else if (leetcodeContestRating >= 1750) dsaIndex = Math.max(dsaIndex, 0.85);

    let problemSolvingIndex = dsaIndex;
    if (leetcodeMediumHard >= 150) problemSolvingIndex = Math.min(1.0, problemSolvingIndex + 0.1);

    // Implementation Index (GitHub repo volume & languages)
    const implementationIndex = Math.min(1.0, Math.round((Math.log10(githubRepoCount + 1) / 1.5) * 100) / 100);

    // Confidence Calculation (Evidence depth + source diversity)
    const sourceCount = sourcesSet.size;
    let confidenceScore = 0;
    if (evidenceList.length === 0) {
      confidenceScore = 0;
    } else {
      const volumeFactor = Math.min(0.5, evidenceList.length / 20); // Up to 0.5 for 10+ signals
      const diversityFactor = sourceCount >= 2 ? 0.35 : 0.20;       // Multi-source bonus
      const weightFactor = Math.min(0.15, totalEvidenceWeight / 50); // Weight factor
      confidenceScore = Math.min(1.0, Math.round((volumeFactor + diversityFactor + weightFactor) * 100) / 100);
    }

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (confidenceScore >= 0.70) confidence = 'high';
    else if (confidenceScore >= 0.40) confidence = 'medium';

    // Technical level determination
    let technicalLevel: ExperienceLevel = profileEntity?.experienceLevel || 'beginner';
    if (!profileEntity?.experienceLevel) {
      if (
        (githubRepoCount >= 5 && Object.keys(normalizedLanguages).length >= 3 && totalEvidenceWeight > 30) ||
        (leetcodeTotalSolved >= 300 && leetcodeMediumHard >= 100) ||
        (leetcodeContestRating >= 1800)
      ) {
        technicalLevel = 'advanced';
      } else if (githubRepoCount >= 2 || leetcodeTotalSolved >= 50 || totalEvidenceWeight > 10) {
        technicalLevel = 'intermediate';
      }
    }

    return new DeveloperCapabilityProfile({
      userId,
      languages: normalizedLanguages,
      frameworks: normalizedFrameworks,
      domains: normalizedDomains,
      skills: normalizedSkills,
      dsaIndex,
      problemSolvingIndex,
      implementationIndex,
      technicalLevel,
      confidence,
      confidenceScore,
      evidenceCount: evidenceList.length,
      sources: Array.from(sourcesSet),
      interests: profileEntity?.interests || [],
      taxonomyVersion: this.TAXONOMY_VERSION,
      scoringVersion: this.SCORING_VERSION,
      lastVerifiedAt: profileEntity?.lastComputedAt || now
    });
  }

  public toJSON(): DeveloperCapabilityProfileProps {
    return {
      ...this.props,
      languages: { ...this.props.languages },
      frameworks: { ...this.props.frameworks },
      domains: { ...this.props.domains },
      sources: [...this.props.sources],
      interests: [...this.props.interests]
    };
  }
}
