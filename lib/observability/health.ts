import { supabase } from '@/lib/supabase';
import { appConfig } from '@/config/app';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: boolean;
    storage: boolean;
  };
}

const startTime = Date.now();

export async function checkSystemHealth(): Promise<HealthCheckResult> {
  let dbOk = false;
  let storageOk = false;

  try {
    const { data } = await supabase.from('hackathons').select('id').limit(1);
    dbOk = Array.isArray(data);
  } catch {
    dbOk = false;
  }

  try {
    const { data } = await supabase.storage.listBuckets();
    storageOk = Array.isArray(data);
  } catch {
    storageOk = false;
  }

  const isHealthy = dbOk && storageOk;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: appConfig.version,
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk,
      storage: storageOk
    }
  };
}
