import { computeTrendingJob } from '@/jobs/computeTrending';
import { refreshCacheJob } from '@/jobs/refreshCache';

export async function runHourlyCron() {
  console.log('[CRON] Executing hourly cron tasks...');
  await computeTrendingJob.execute();
  await refreshCacheJob.execute();
  console.log('[CRON] Hourly cron completed.');
}
