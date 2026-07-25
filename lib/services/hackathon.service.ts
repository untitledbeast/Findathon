import { HackathonRepository } from '../domain/hackathon.repository';
import { mapHackathonDetailToDTO } from '../domain/mappers/hackathon.mapper';
import { HackathonDetailDTO } from '../domain/dtos/hackathon.dto';
import { entityCache } from './entity-cache.service';
import { AnalyticsService } from './analytics.service';

export const HackathonService = {
  async getDetail(id: string, trackPageView = true): Promise<HackathonDetailDTO | null> {
    if (!id) return null;

    const cacheKey = `hackathon_detail_${id}`;
    const cached = entityCache.get<HackathonDetailDTO>(cacheKey);
    if (cached) {
      if (trackPageView) {
        AnalyticsService.trackEvent({ eventType: 'page_view', hackathonId: id });
      }
      return cached;
    }

    // Fetch raw records via pure repository
    const rawHackathon = await HackathonRepository.getById(id);
    if (!rawHackathon) return null;

    const dto = mapHackathonDetailToDTO(rawHackathon as unknown as Record<string, unknown>);

    // Save to Entity Cache
    entityCache.set(cacheKey, dto);

    // Track analytics asynchronously
    if (trackPageView) {
      AnalyticsService.trackEvent({ eventType: 'page_view', hackathonId: id });
    }

    return dto;
  },

  async registerClick(id: string): Promise<void> {
    AnalyticsService.trackEvent({ eventType: 'register_click', hackathonId: id });
  }
};
