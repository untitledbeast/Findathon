import { SkillNormalizer } from '../skills/skill-normalizer';
import { HackathonEntity } from '../entities/hackathon.entity';

export interface HackathonCapabilityProfileProps {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string | null;
  requiredLanguages: string[];      // Canonical IDs (e.g. 'language.typescript')
  preferredLanguages: string[];     // Canonical IDs
  frameworks: string[];             // Canonical IDs (e.g. 'framework.react')
  domains: string[];                // Canonical IDs (e.g. 'domain.ai_ml', 'domain.web3')
  skills: string[];                 // Canonical IDs (e.g. 'skill.dsa')
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open';
  isOnline: boolean;
  locationCity: string | null;
  locationCollege: string | null;
  registrationDeadline: Date | null;
  eventStart: Date;
  eventEnd: Date;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
  prizeAmount: number;
  dataQuality: 'high' | 'medium' | 'low';
  rawTags: string[];
}

export class HackathonCapabilityProfile {
  constructor(private readonly props: HackathonCapabilityProfileProps) {}

  public get id(): string { return this.props.id; }
  public get title(): string { return this.props.title; }
  public get slug(): string { return this.props.slug; }
  public get description(): string { return this.props.description; }
  public get tagline(): string | null { return this.props.tagline; }
  public get requiredLanguages(): string[] { return [...this.props.requiredLanguages]; }
  public get preferredLanguages(): string[] { return [...this.props.preferredLanguages]; }
  public get frameworks(): string[] { return [...this.props.frameworks]; }
  public get domains(): string[] { return [...this.props.domains]; }
  public get skills(): string[] { return [...this.props.skills]; }
  public get difficulty(): 'beginner' | 'intermediate' | 'advanced' | 'open' { return this.props.difficulty; }
  public get isOnline(): boolean { return this.props.isOnline; }
  public get locationCity(): string | null { return this.props.locationCity; }
  public get locationCollege(): string | null { return this.props.locationCollege; }
  public get registrationDeadline(): Date | null { return this.props.registrationDeadline; }
  public get eventStart(): Date { return this.props.eventStart; }
  public get eventEnd(): Date { return this.props.eventEnd; }
  public get status(): string { return this.props.status; }
  public get isVerified(): boolean { return this.props.isVerified; }
  public get isFeatured(): boolean { return this.props.isFeatured; }
  public get prizeAmount(): number { return this.props.prizeAmount; }
  public get dataQuality(): 'high' | 'medium' | 'low' { return this.props.dataQuality; }
  public get rawTags(): string[] { return [...this.props.rawTags]; }

  /**
   * Normalizes raw hackathon data (from Entity or DTO) into structured capability requirements.
   */
  public static fromEntity(hackathon: HackathonEntity): HackathonCapabilityProfile {
    const rawTags = hackathon.tags || [];
    const normalizedDirect = SkillNormalizer.normalizeMany(rawTags);
    const extractedFromText = SkillNormalizer.extractFromText(`${hackathon.title} ${hackathon.tagline || ''} ${hackathon.description || ''}`);

    const allSkills = new Map<string, { id: string; category: string; displayLabel: string }>();
    for (const s of [...normalizedDirect, ...extractedFromText]) {
      allSkills.set(s.id, s);
    }

    const requiredLanguages: string[] = [];
    const preferredLanguages: string[] = [];
    const frameworks: string[] = [];
    const domains: string[] = [];
    const skills: string[] = [];

    for (const skill of allSkills.values()) {
      if (skill.category === 'language') {
        requiredLanguages.push(skill.id);
      } else if (skill.category === 'framework') {
        frameworks.push(skill.id);
      } else if (skill.category === 'domain') {
        domains.push(skill.id);
      } else if (skill.category === 'skill') {
        skills.push(skill.id);
      }
    }

    // Default domain if none extracted but tags suggest general domains
    if (domains.length === 0) {
      if (frameworks.some(f => f.includes('react') || f.includes('next'))) domains.push('domain.frontend');
      if (frameworks.some(f => f.includes('node') || f.includes('express') || f.includes('django'))) domains.push('domain.backend');
      if (requiredLanguages.some(l => l.includes('python'))) domains.push('domain.ai_ml');
      if (domains.length === 0) domains.push('domain.fullstack');
    }

    // Evaluate hackathon data quality
    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    const hasRichDescription = (hackathon.description || '').length >= 100;
    const hasTags = rawTags.length > 0;
    const hasDeadline = !!hackathon.registrationWindow?.getDeadline();

    if (hasRichDescription && hasTags && hasDeadline) {
      dataQuality = 'high';
    } else if (hasRichDescription || hasTags) {
      dataQuality = 'medium';
    }

    return new HackathonCapabilityProfile({
      id: hackathon.id,
      title: hackathon.title,
      slug: hackathon.slug.getValue(),
      description: hackathon.description,
      tagline: hackathon.tagline,
      requiredLanguages,
      preferredLanguages,
      frameworks,
      domains,
      skills,
      difficulty: hackathon.difficulty || 'open',
      isOnline: hackathon.location.getIsOnline(),
      locationCity: hackathon.location.getCity() || null,
      locationCollege: hackathon.location.getCollege() || null,
      registrationDeadline: hackathon.registrationWindow?.getDeadline() || null,
      eventStart: hackathon.dateRange.getStartDate(),
      eventEnd: hackathon.dateRange.getEndDate(),
      status: hackathon.status.getValue(),
      isVerified: hackathon.isVerified,
      isFeatured: hackathon.isFeatured,
      prizeAmount: hackathon.prizePool.getNumericAmount(),
      dataQuality,
      rawTags
    });
  }

  /**
   * Constructs from raw Supabase row or API DTO.
   */
  public static fromRow(row: Record<string, unknown>): HackathonCapabilityProfile {
    const rawTags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    const normalizedDirect = SkillNormalizer.normalizeMany(rawTags);
    const textCorpus = `${row.title || ''} ${row.tagline || ''} ${row.description || ''}`;
    const extractedFromText = SkillNormalizer.extractFromText(textCorpus);

    const allSkills = new Map<string, { id: string; category: string; displayLabel: string }>();
    for (const s of [...normalizedDirect, ...extractedFromText]) {
      allSkills.set(s.id, s);
    }

    const requiredLanguages: string[] = [];
    const frameworks: string[] = [];
    const domains: string[] = [];
    const skills: string[] = [];

    for (const skill of allSkills.values()) {
      if (skill.category === 'language') {
        requiredLanguages.push(skill.id);
      } else if (skill.category === 'framework') {
        frameworks.push(skill.id);
      } else if (skill.category === 'domain') {
        domains.push(skill.id);
      } else if (skill.category === 'skill') {
        skills.push(skill.id);
      }
    }

    if (domains.length === 0) {
      domains.push('domain.fullstack');
    }

    const deadlineStr = row.registration_deadline || row.registrationDeadline;
    const deadline = deadlineStr ? new Date(String(deadlineStr)) : null;
    const startStr = row.start_date || row.startDate || new Date().toISOString();
    const endStr = row.end_date || row.endDate || new Date().toISOString();

    return new HackathonCapabilityProfile({
      id: String(row.id || ''),
      title: String(row.title || ''),
      slug: String(row.slug || row.id || ''),
      description: String(row.description || ''),
      tagline: row.tagline ? String(row.tagline) : null,
      requiredLanguages,
      preferredLanguages: [],
      frameworks,
      domains,
      skills,
      difficulty: (row.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'open') || 'open',
      isOnline: Boolean(row.is_online !== undefined ? row.is_online : row.isOnline),
      locationCity: row.location_city ? String(row.location_city) : (row.locationCity ? String(row.locationCity) : null),
      locationCollege: row.location_college ? String(row.location_college) : null,
      registrationDeadline: deadline && !isNaN(deadline.getTime()) ? deadline : null,
      eventStart: new Date(String(startStr)),
      eventEnd: new Date(String(endStr)),
      status: String(row.status || 'approved'),
      isVerified: Boolean(row.is_verified || row.isVerified),
      isFeatured: Boolean(row.is_featured || row.isFeatured),
      prizeAmount: Number(row.prize_amount || row.prizeAmount || 0),
      dataQuality: (rawTags.length > 0 && String(row.description || '').length > 80) ? 'high' : 'medium',
      rawTags
    });
  }
}
