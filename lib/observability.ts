export interface ObservabilityMetric {
  name: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class ObservabilityLogger {
  private metrics: ObservabilityMetric[] = [];

  logPerformance(name: string, durationMs: number, metadata?: Record<string, unknown>) {
    const metric: ObservabilityMetric = {
      name,
      durationMs,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.metrics.push(metric);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] ${name}: ${durationMs.toFixed(2)}ms`, metadata || '');
    }
  }

  getRecentMetrics(): ObservabilityMetric[] {
    return this.metrics.slice(-50);
  }
}

export const observability = new ObservabilityLogger();
