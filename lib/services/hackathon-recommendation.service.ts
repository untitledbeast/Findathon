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
  limit?: number;
  page?: number;
}

export interface RecommendationResponse {
  isPersonalized: boolean;
  isStale: boolean;
  staleMessage?: string;
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

    const hasTechnicalEvidence = evidenceList.some(e => e.source === 'github' || e.source === 'leetcode');
    const isPersonalized = Boolean(userId && hasTechnicalEvidence);
    const hasOnlyLinkedIn = Boolean(userId && evidenceList.length > 0 && !hasTechnicalEvidence);
    
    // Check if evidence is older than 60 days
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const isStale = Boolean(
      isPersonalized &&
      developerProfileEntity?.lastComputedAt &&
      (now - developerProfileEntity.lastComputedAt) > SIXTY_DAYS_MS
    );
    let staleMessage: string | undefined = undefined;
    if (hasOnlyLinkedIn) {
      staleMessage = 'LinkedIn is connected. Connect GitHub or LeetCode for stronger technical recommendations.';
    } else if (isStale) {
      staleMessage = 'Your recommendations may improve after syncing your GitHub or LeetCode account.';
    }

    // Fetch approved, upcoming hackathons
    const client = await this.getClient();
    let query = client
      .from('hackathons')
      .select('*')
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

        const match = HackathonMatchEngine.calculateMatch(capabilityProfile, hackCapability, eligibility, now);

        // Deterministic Base Ranking Score
        const baseRankScore = (match.overallScore * 0.70) + (match.confidenceScore * 0.20) + (eligibility.actionability * 0.10);
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
    // Initial sort by baseRankScore
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
      // Find the best candidate taking diversity into account
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

    return {
      isPersonalized,
      isStale,
      staleMessage,
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
