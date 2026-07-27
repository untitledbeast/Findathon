import { ModuleManifest } from '@/lib/composition/module-manifest.interface';

export const ProfileModuleManifest: ModuleManifest = {
  name: 'profile',
  owner: 'Identity Team',
  dependencies: [],
  routes: ['/api/v1/auth/profile'],
  workerJobs: [],
  featureFlags: ['onboarding_wizard_v2'],
  migrations: ['202607260001_create_profiles.sql', '202607260002_create_user_achievements.sql'],
  cacheNamespaces: ['profile:*', 'recommendations:*'],
  publicContracts: ['ProfileEntity', 'ProfileService', 'ProfileDTO', 'profileApi'],
  integrationEvents: ['ProfileUpdatedIntegrationEvent.v1', 'OnboardingCompletedIntegrationEvent.v1'],
  ownedTables: ['profiles', 'user_achievements', 'achievements'],
  performanceSLA: {
    targetP95Ms: 250,
    cacheStrategy: 'redis_key_value',
    fallbackStrategy: 'supabase_direct_query',
    healthProbeUrl: '/api/v1/health'
  },
  tests: {
    unit: true,
    integration: true,
    architecture: true
  }
};
