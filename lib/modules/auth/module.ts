import { ModuleManifest } from '@/lib/composition/module-manifest.interface';

export const AuthModuleManifest: ModuleManifest = {
  name: 'auth',
  owner: 'Identity Team',
  dependencies: ['profile'],
  routes: ['/api/v1/auth/profile', '/auth/callback'],
  workerJobs: [],
  featureFlags: ['auth_google_enabled'],
  migrations: ['202607260001_create_profiles.sql'],
  cacheNamespaces: ['auth:*'],
  publicContracts: ['AuthService', 'authApi'],
  integrationEvents: ['UserAuthenticatedIntegrationEvent.v1'],
  ownedTables: [],
  performanceSLA: {
    targetP95Ms: 200,
    cacheStrategy: 'session_token',
    fallbackStrategy: 'anonymous_context',
    healthProbeUrl: '/api/v1/health'
  },
  tests: {
    unit: true,
    integration: true,
    architecture: true
  }
};
