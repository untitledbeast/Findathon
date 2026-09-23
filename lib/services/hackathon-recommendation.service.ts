import { RequestContext } from '../context/request-context';
import { IDeveloperProfileRepository } from '../domain/repositories/developer-profile.repository.interface';
import { DeveloperProfileEntity } from '../domain/entities/developer-profile.entity';
import { DeveloperSkillEvidenceEntity } from '../domain/entities/developer-skill-evidence.entity';
import { DeveloperCapabilityProfile } from '../domain/value-objects/developer-capability-profile';
import { HackathonCapabilityProfile } from '../domain/value-objects/hackathon-capability-profile';
import { EligibilityEngine } from '../domain/matching/eligibility-engine';
import { HackathonMatchEngine, HackathonMatchResult } from '../domain/matching/hackathon-match-engine';
import { HackathonAnalysisService } from './hackathon-analysis.service';
import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface RecommendationFilterOptions {
  mode?: 'online' | 'in-person';
  domain?: string;
  search?: string;
  locationCity?: string;
  userLat?: number;
  userLng?: number;
  limit?: number;
  page?: number;
}

export interface RecommendationResponse {
  isPersonalized: boolean;
  isStale: boolean;
  staleMessage?: string;
  recommendationMode: 'COLD_START' | 'LIGHT_PERSONALIZATION' | 'FULL_PERSONALIZATION';
  diagnostics: {
    engineVersion: string;
    featureVersion: string;
    candidateCount: number;
    eligibleCount: number;
  };
  recommendations: Array<{
    hackathon: {
      id: string;
      title: string;
      slug: string;
      description: string;
      tagline: string | null;
      startDate: string;
      endDate: string;
      registrationDeadline: string | null;
      isOnline: boolean;
      locationCity: string | null;
      prizeAmount: number;
      tags: string[];
      coverImageUrl: string | null;
      isFeatured: boolean;
      isVerified: boolean;
    };
    match: HackathonMatchResult;
  }>;
  developerCapability: {
    technicalLevel: string;
    confidence: 'high' | 'medium' | 'low';
    evidenceCount: number;
    sources: string[];
    topLanguages: string[];
    topDomains: string[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  computedAt: string;
}

export class HackathonRecommendationService {
  constructor(
    private readonly profileRepo: IDeveloperProfileRepository
  ) {}

  private async getClient() {
    if (typeof window === 'undefined') {
      try {
        return await createSupabaseServerClient();
      } catch {
        return supabase;
      }
    }
    return supabase;
  }

  /**
   * Generates personalized, deterministic hackathon recommendations for the authenticated user.
   */
  public async getRecommendations(
    context: RequestContext,
    options: RecommendationFilterOptions = {}
  ): Promise<RecommendationResponse> {
    const limit = Math.max(1, Math.min(20, options.limit || 6));
    const page = Math.max(1, options.page || 1);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const userId = context.user?.id;
    let developerProfileEntity: DeveloperProfileEntity | null = null;
    let evidenceList: DeveloperSkillEvidenceEntity[] = [];

    if (userId) {
      developerProfileEntity = await this.profileRepo.getByUserId(userId);
      evidenceList = await this.profileRepo.getEvidenceByUserId(userId);
    }

    const capabilityProfile = DeveloperCapabilityProfile.fromEvidence(
      userId || 'anonymous',
      developerProfileEntity,
      evidenceList,
      now
    );

    const isPersonalized = Boolean(userId && evidenceList.length > 0);
    
    // Check if evidence is older than 60 days
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const isStale = Boolean(
      isPersonalized &&
      developerProfileEntity?.lastComputedAt &&
      (now - developerProfileEntity.lastComputedAt) > SIXTY_DAYS_MS
    );
    const staleMessage = isStale
      ? 'Your recommendations may improve after syncing your GitHub or LeetCode account.'
      : undefined;

    // GATE 19: Performance Correction — Select only candidate fields instead of select('*')
    const CANDIDATE_PROJECTION = 
      'id, title, slug, description, tagline, tags, is_online, location_city, location_college, latitude, longitude, registration_deadline, start_date, end_date, status, is_verified, is_featured, prize_amount, difficulty, cover_image_url';

    const client = await this.getClient();
    let query = client
      .from('hackathons')
      .select(CANDIDATE_PROJECTION)
      .eq('status', 'approved')
      .gte('end_date', nowIso);

    if (options.mode === 'online') {
      query = query.eq('is_online', true);
    } else if (options.mode === 'in-person') {
      query = query.eq('is_online', false);
    }

    const { data: rawHackathons, error } = await query;

    if (error || !rawHackathons) {
      console.error('[HackathonRecommendationService] Error fetching hackathons:', error);
      return {
        isPersonalized,
        isStale,
        staleMessage,
        recommendationMode: 'COLD_START',
        diagnostics: {
          engineVersion: '1.5.0',
          featureVersion: 'v2',
          candidateCount: 0,
          eligibleCount: 0
        },
        recommendations: [],
        developerCapability: {
          technicalLevel: capabilityProfile.technicalLevel,
          confidence: capabilityProfile.confidence,
          evidenceCount: capabilityProfile.evidenceCount,
          sources: capabilityProfile.sources,
          topLanguages: Object.keys(capabilityProfile.languages).slice(0, 5),
          topDomains: Object.keys(capabilityProfile.domains).slice(0, 3)
        },
        pagination: { total: 0, page, limit, totalPages: 0 },
        computedAt: new Date(now).toISOString()
      };
    }

    // Build recommendation matching context (GATES 8, 9, 10, 11)
    const matchContext = {
      userInterests: capabilityProfile.interests,
      userLocation: {
        city: options.locationCity || null,
        latitude: options.userLat || null,
        longitude: options.userLng || null
      },
      currentQuery: options.search,
      activeFilters: {
        mode: options.mode,
        domain: options.domain
      },
      currentSurface: 'recommendations'
    };

    // Process & Score Candidates with Structured Analysis
    const candidates: Array<{
      hackathonRow: Record<string, unknown>;
      capability: HackathonCapabilityProfile;
      match: HackathonMatchResult;
      primaryDomain: string;
      baseRankScore: number;
    }> = [];

    for (const row of rawHackathons) {
      try {
        const analysis = HackathonAnalysisService.analyze(row);
        const hackCapability = analysis.capabilityProfile;
        const eligibility = EligibilityEngine.evaluate(hackCapability, now);

        if (!eligibility.isEligible) {
          continue; // Filter out closed or ended events
        }

        // Apply domain filter if requested
        if (options.domain && options.domain !== 'all') {
          const domMatch = hackCapability.domains.some(d => d.toLowerCase().includes(options.domain!.toLowerCase()));
          const tagMatch = hackCapability.rawTags.some(t => t.toLowerCase().includes(options.domain!.toLowerCase()));
          if (!domMatch && !tagMatch) continue;
        }

        const match = HackathonMatchEngine.calculateMatch(capabilityProfile, hackCapability, eligibility, now, matchContext);

        // Deterministic Base Ranking Score:
        // In cold start: balance quality (30%), actionability (40%), freshness (30%)
        // In personalized: capability fit (60%), confidence (20%), actionability (20%)
        let baseRankScore: number;
        if (match.recommendationMode === 'COLD_START') {
          const qualityScore = hackCapability.dataQuality === 'high' ? 1.0 : (hackCapability.dataQuality === 'medium' ? 0.70 : 0.40);
          const freshnessScore = Math.max(0.2, 1.0 - Math.min(1.0, (now - hackCapability.eventStart.getTime()) / (30 * 86400000)));
          baseRankScore = (eligibility.actionability * 0.40) + (qualityScore * 0.35) + (freshnessScore * 0.25);
        } else {
          baseRankScore = (match.overallScore * 0.65) + (match.confidenceScore * 0.20) + (eligibility.actionability * 0.15);
        }

        const primaryDomain = hackCapability.domains[0] || 'general';

        candidates.push({
          hackathonRow: row,
          capability: hackCapability,
          match,
          primaryDomain,
          baseRankScore
        });
      } catch (err) {
        console.warn(`[HackathonRecommendationService] Skipping malformed hackathon ${row.id}:`, err);
      }
    }

    // Sort with deterministic diversity penalty
    candidates.sort((a, b) => {
      if (b.baseRankScore !== a.baseRankScore) {
        return b.baseRankScore - a.baseRankScore;
      }
      return a.capability.id.localeCompare(b.capability.id);
    });

    // Diversity Pass: Ensure the recommendations don't show 5 consecutive identical domain tracks
    const selected: typeof candidates = [];
    const pool = [...candidates];
    const seenDomains = new Map<string, number>();

    while (pool.length > 0) {
      let bestIndex = 0;
      let bestAdjustedScore = -Infinity;

      for (let i = 0; i < pool.length; i++) {
        const item = pool[i];
        const domainCount = seenDomains.get(item.primaryDomain) || 0;
        // Bounded diminishing diversity penalty: max 0.10 adjustment to never bury highly relevant matches
        const diversityPenalty = Math.min(0.10, domainCount * 0.035);
        const adjustedScore = item.baseRankScore - diversityPenalty;

        if (adjustedScore > bestAdjustedScore) {
          bestAdjustedScore = adjustedScore;
          bestIndex = i;
        }
      }

      const chosen = pool.splice(bestIndex, 1)[0];
      selected.push(chosen);
      seenDomains.set(chosen.primaryDomain, (seenDomains.get(chosen.primaryDomain) || 0) + 1);
    }

    const total = selected.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = selected.slice(offset, offset + limit);

    const recommendations = paginated.map(item => ({
      hackathon: {
        id: item.capability.id,
        title: item.capability.title,
        slug: item.capability.slug,
        description: item.capability.description,
        tagline: item.capability.tagline,
        startDate: item.capability.eventStart.toISOString(),
        endDate: item.capability.eventEnd.toISOString(),
        registrationDeadline: item.capability.registrationDeadline?.toISOString() || null,
        isOnline: item.capability.isOnline,
        locationCity: item.capability.locationCity,
        prizeAmount: item.capability.prizeAmount,
        tags: item.capability.rawTags,
        coverImageUrl: item.hackathonRow.cover_image_url ? String(item.hackathonRow.cover_image_url) : null,
        isFeatured: item.capability.isFeatured,
        isVerified: item.capability.isVerified
      },
      match: item.match
    }));

    const resolvedMode = candidates.length > 0 ? (candidates[0].match.recommendationMode || 'COLD_START') : (isPersonalized ? 'LIGHT_PERSONALIZATION' : 'COLD_START');

    return {
      isPersonalized,
      isStale,
      staleMessage,
      recommendationMode: resolvedMode,
      diagnostics: {
        engineVersion: '1.5.0',
        featureVersion: 'v2',
        candidateCount: rawHackathons.length,
        eligibleCount: candidates.length
      },
      recommendations,
      developerCapability: {
        technicalLevel: capabilityProfile.technicalLevel,
        confidence: capabilityProfile.confidence,
        evidenceCount: capabilityProfile.evidenceCount,
        sources: capabilityProfile.sources,
        topLanguages: Object.keys(capabilityProfile.languages).slice(0, 5),
        topDomains: Object.keys(capabilityProfile.domains).slice(0, 3)
      },
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      computedAt: new Date(now).toISOString()
    };
  }
}
