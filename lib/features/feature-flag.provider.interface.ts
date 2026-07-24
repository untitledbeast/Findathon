export interface IFeatureFlagProvider {
  isEnabled(flagKey: string): Promise<boolean>;
}
