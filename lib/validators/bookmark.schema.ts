import { z } from 'zod';

export const bookmarkSchema = z.object({
  hackathonId: z.string().min(1, 'Hackathon ID is required')
});
