export interface ModuleManifest {
  readonly name: string;
  readonly owner: string;
  readonly dependencies: readonly string[];
  readonly routes: readonly string[];
  readonly workerJobs: readonly string[];
  readonly featureFlags: readonly string[];
  readonly migrations: readonly string[];
  readonly cacheNamespaces: readonly string[];
  readonly publicContracts: readonly string[];
  readonly integrationEvents: readonly string[];
  readonly ownedTables: readonly string[];
  readonly performanceSLA: {
    readonly targetP95Ms: number;
    readonly cacheStrategy: string;
    readonly fallbackStrategy: string;
    readonly healthProbeUrl: string;
  };
  readonly tests: {
    readonly unit: boolean;
    readonly integration: boolean;
    readonly architecture: boolean;
  };
}
