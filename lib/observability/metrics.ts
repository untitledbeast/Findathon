type MetricRecord = {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
};

class MetricsCollector {
  private metrics: MetricRecord[] = [];

  record(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-250);
    }
  }

  getMetrics(): MetricRecord[] {
    return [...this.metrics];
  }
}

export const metrics = new MetricsCollector();
