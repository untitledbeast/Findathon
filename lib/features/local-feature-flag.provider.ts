/**
 * INERT INFRASTRUCTURE CONTRACT
 * Reserved for feature flag runtime checks when dynamic feature toggling is implemented.
 * Tracked in docs/architecture.md.
 */
import { IFeatureFlagProvider } from './feature-flag.provider.interface';

export class LocalFeatureFlagProvider implements IFeatureFlagProvider {
  private flags: Record<string, boolean> = {
    enableReviews: true,
    enableCompare: true,
    enableNotifications: true,
    enableAISearch: true
  };

  async isEnabled(flagKey: string): Promise<boolean> {
    return this.flags[flagKey] ?? true;
  }
}

export const featureFlags = new LocalFeatureFlagProvider();
