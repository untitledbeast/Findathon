import { AuthService } from '@/lib/auth/auth.service';
import { createDeveloperProfileQueryService } from '@/lib/services/factories';
import { formatResponse, formatError } from '@/lib/transport/api-response';
import { AuthenticationError } from '@/lib/errors';
import { DeveloperProfileMapper } from '@/lib/domain/mappers/developer-profile.mapper';

export async function GET() {
  try {
    const user = await AuthService.getUser();
    if (!user) {
      return formatError(new AuthenticationError('Authentication required to view developer profile'));
    }

    const queryService = createDeveloperProfileQueryService();
    const result = await queryService.getProfile(user.id);

    return formatResponse({
      profile: DeveloperProfileMapper.entityToDTO(result.profile),
      evidenceCount: result.evidenceCount,
      recentEvidence: result.recentEvidence.map(e => e.toJSON())
    });
  } catch (error) {
    return formatError(error as Error);
  }
}
