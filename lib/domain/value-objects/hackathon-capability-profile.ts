import { HackathonEntity } from '../entities/hackathon.entity';
import { HackathonAnalysisService } from '../../services/hackathon-analysis.service';

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
  latitude?: number | null;
  longitude?: number | null;
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
  public get latitude(): number | null { return this.props.latitude ?? null; }
  public get longitude(): number | null { return this.props.longitude ?? null; }
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
   * Normalizes raw hackathon data (from Entity) via the canonical HackathonAnalysisService.
   * GATE 6: Eliminates hackathon profile divergence by having exactly ONE normalization path.
   */
  public static fromEntity(hackathon: HackathonEntity): HackathonCapabilityProfile {
    return HackathonAnalysisService.analyze(hackathon).capabilityProfile;
  }

  /**
   * Constructs from raw Supabase row or API DTO via the canonical HackathonAnalysisService.
   * GATE 6: Eliminates hackathon profile divergence by having exactly ONE normalization path.
   */
  public static fromRow(row: Record<string, unknown>): HackathonCapabilityProfile {
    return HackathonAnalysisService.analyze(row).capabilityProfile;
  }
}
