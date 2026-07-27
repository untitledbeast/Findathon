import { ModuleManifest } from '@/lib/composition/module-manifest.interface';

export const SearchModuleManifest: ModuleManifest = {
  name: 'search',
  owner: 'Discovery Team',
  dependencies: ['hackathons'],
  routes: ['/api/v1/hackathons/search/suggestions'],
  workerJobs: ['search-index.worker.ts'],
  featureFlags: ['spotlight_cmd_k', 'intent_parser_v2'],
  migrations: ['202607260004_create_search_projections.sql'],
  cacheNamespaces: ['search:suggestions:*'],
  publicContracts: ['GetSearchSuggestionsHandler', 'searchApi'],
  integrationEvents: [],
  ownedTables: [],
  performanceSLA: {
    targetP95Ms: 150,
    cacheStrategy: 'memory_cache',
    fallbackStrategy: 'static_categories_fallback',
    healthProbeUrl: '/api/v1/health'
  },
  tests: {
    unit: true,
    integration: true,
    architecture: true
  }
};
