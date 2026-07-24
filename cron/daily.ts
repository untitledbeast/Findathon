import { computeQualityJob } from '@/jobs/computeQuality';

export async function runDailyCron() {
  console.log('[CRON] Executing daily cron tasks...');
  await computeQualityJob.execute();
  console.log('[CRON] Daily cron completed.');
}
