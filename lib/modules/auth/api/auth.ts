import { transportClient } from '@/lib/transport/http-client';

export const authApi = {
  signInWithGoogle: async (redirectTo?: string): Promise<{ url: string }> => {
    return transportClient<{ url: string }>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ redirectTo })
    });
  },

  signOut: async (): Promise<void> => {
    return transportClient<void>('/api/v1/auth/signout', {
      method: 'POST'
    });
  }
};
