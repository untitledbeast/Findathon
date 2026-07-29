import { adminClient } from '@/lib/supabase-admin';

export interface AnalyticsEventDTO {
  id: string;
  event: string;
  hackathonId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  createdAt: string;
}

export class AdminAnalyticsRepository {
  public async getTopHackathons(limit: number): Promise<Array<{ id: string; title: string; viewCount: number; saveCount: number }>> {
    const { data, error } = await adminClient
      .from('hackathons')
      .select('id, title, view_count, save_count')
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map(r => ({
      id: r.id,
      title: r.title,
      viewCount: r.view_count || 0,
      saveCount: r.save_count || 0
    }));
  }

  public async getRecentEvents(limit: number): Promise<AnalyticsEventDTO[]> {
    const { data, error } = await adminClient
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map(r => ({
      id: r.id,
      event: r.event,
      hackathonId: r.hackathon_id,
      metadata: r.metadata,
      createdAt: r.created_at
    }));
  }

  public async getSearchTerms(limit: number): Promise<Array<{ term: string; count: number }>> {
    // Note: A true group by in Supabase client is not directly supported without RPC or custom view.
    // Assuming we fetch the most recent searches and aggregate in memory for simplicity, or we rely on a custom query.
    // For now, let's fetch a large batch of search events and aggregate.
    const { data, error } = await adminClient
      .from('analytics_events')
      .select('metadata')
      .eq('event', 'search')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const term = (row.metadata?.query as string)?.toLowerCase()?.trim();
      if (term) {
        counts[term] = (counts[term] || 0) + 1;
      }
    }

    const terms = Object.entries(counts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return terms;
  }

  public async getEventCountByDay(days: number): Promise<Array<{ date: string; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch all events in the last 'days' and group them in memory
    const { data, error } = await adminClient
      .from('analytics_events')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (error) throw new Error(error.message);

    const countsByDate: Record<string, number> = {};
    
    // Initialize the last N days to 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      countsByDate[d.toISOString().split('T')[0]] = 0;
    }

    for (const row of data || []) {
      const dateStr = row.created_at.split('T')[0];
      if (countsByDate[dateStr] !== undefined) {
        countsByDate[dateStr]++;
      }
    }

    return Object.entries(countsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
