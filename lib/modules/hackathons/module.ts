import { ModuleManifest } from '@/lib/composition/module-manifest.interface';

export const HackathonsModuleManifest: ModuleManifest = {
  name: 'hackathons',
  owner: 'Hackathons Core Team',
  dependencies: ['profile'],
  routes: ['/api/v1/hackathons', '/api/v1/hackathons/[id]', '/api/v1/hackathons/search', '/api/v1/hackathons/map'],
  workerJobs: ['search-index.worker.ts'],
  featureFlags: ['search_v2_projections', 'spatial_map_clustering'],
  migrations: ['202607260003_create_hackathons.sql', '202607260004_create_search_projections.sql'],
  cacheNamespaces: ['hackathon:*', 'search:*', 'featured:*'],
  publicContracts: ['HackathonAggregate', 'SearchHackathonsHandler', 'GetHackathonDetailHandler', 'hackathonsApi'],
  integrationEvents: ['HackathonPublishedIntegrationEvent.v1', 'SearchReindexRequestedIntegrationEvent.v1'],
  ownedTables: ['hackathons', 'search_projections'],
  performanceSLA: {
    targetP95Ms: 300,
    cacheStrategy: 'redis_and_memory_singleflight',
    fallbackStrategy: 'supabase_fts_query',
    healthProbeUrl: '/api/v1/ready'
  },
  tests: {
    unit: true,
    integration: true,
    architecture: true
  }
};
