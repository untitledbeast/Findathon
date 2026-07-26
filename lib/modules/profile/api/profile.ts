import { transportClient } from '@/lib/transport/http-client';
import { ProfileDTO } from '../application/dtos/ProfileDTO';

export const profileApi = {
  getProfile: async (): Promise<ProfileDTO> => {
    return transportClient<ProfileDTO>('/api/v1/auth/profile');
  },

  updateProfile: async (updates: Partial<ProfileDTO>): Promise<ProfileDTO> => {
    return transportClient<ProfileDTO>('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  completeOnboarding: async (data: { interests: string[]; skills: string[] }): Promise<ProfileDTO> => {
    return transportClient<ProfileDTO>('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        ...data,
        onboardingComplete: true,
        isFirstLogin: false
      })
    });
  }
};
