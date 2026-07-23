export interface FeatureFlags {
  enableHeatmap: boolean;
  enableTimeline: boolean;
  enableAISearch: boolean;
  enableRecommendations: boolean;
  enableUniversityProfiles: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableHeatmap: true,
  enableTimeline: true,
  enableAISearch: true,
  enableRecommendations: true,
  enableUniversityProfiles: false,
};

export function getFeatureFlags(): FeatureFlags {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('findathon_feature_flags');
      if (stored) return { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) };
    } catch (e) {
      console.error(e);
    }
  }
  return DEFAULT_FEATURE_FLAGS;
}
