export interface SearchAnalyticsEvent {
  query: string;
  search_source: 'home' | 'map' | 'spotlight' | 'categories';
  clicked_result_id?: string;
  position?: number;
  results_count: number;
  response_time_ms: number;
  timestamp: string;
}
