import { Job } from './job.interface';
import { entityCache } from '@/lib/services/entity-cache.service';

export const refreshCacheJob: Job = {
  name: 'RefreshCacheJob',
  retries: 1,
  timeout: 10000,
  concurrency: 1,
  async execute(): Promise<void> {
    entityCache.clear();
  }
};
