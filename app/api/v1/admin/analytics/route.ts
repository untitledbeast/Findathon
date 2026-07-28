import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError, PermissionError } from '@/lib/errors';
import { AdminAnalyticsRepository } from '@/lib/modules/analytics/admin.analytics.repository';

const adminAnalyticsRepo = new AdminAnalyticsRepository();

export async function GET(req: NextRequest) {
  try {
    const user = await AuthService.getUser();
    if (!user) return formatError(new AuthenticationError('Authentication required'));
    
    if (!['admin', 'moderator'].includes(user.role)) {
      return formatError(new PermissionError('Admin or moderator access required'));
    }

    const [topHackathons, recentEvents, searchTerms, eventsByDay] = await Promise.all([
      adminAnalyticsRepo.getTopHackathons(10),
      adminAnalyticsRepo.getRecentEvents(20),
      adminAnalyticsRepo.getSearchTerms(10),
      adminAnalyticsRepo.getEventCountByDay(30)
    ]);
    
    return formatResponse({ topHackathons, recentEvents, searchTerms, eventsByDay });
  } catch (error) {
    return formatError(error as Error);
  }
}
