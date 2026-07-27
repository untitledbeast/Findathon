import { ModuleManifest } from './module-manifest.interface';
import { AuthModuleManifest } from '@/lib/modules/auth/module';
import { ProfileModuleManifest } from '@/lib/modules/profile/module';
import { HackathonsModuleManifest } from '@/lib/modules/hackathons/module';
import { SearchModuleManifest } from '@/lib/modules/search/module';

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly manifests = new Map<string, ModuleManifest>();

  private constructor() {
    this.registerModule(AuthModuleManifest);
    this.registerModule(ProfileModuleManifest);
    this.registerModule(HackathonsModuleManifest);
    this.registerModule(SearchModuleManifest);
  }

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  public registerModule(manifest: ModuleManifest): void {
    this.manifests.set(manifest.name, manifest);
  }

  public getManifest(name: string): ModuleManifest | undefined {
    return this.manifests.get(name);
  }

  public getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values());
  }

  public getHealthProbes(): { module: string; probeUrl: string }[] {
    return this.getAllManifests().map(m => ({
      module: m.name,
      probeUrl: m.performanceSLA.healthProbeUrl
    }));
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();
