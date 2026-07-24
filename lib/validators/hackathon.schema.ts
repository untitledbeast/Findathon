import { z } from 'zod';

export const submitHackathonSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  tagline: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  registrationDeadline: z.string().optional(),
  locationCity: z.string().optional(),
  locationCollege: z.string().optional(),
  fullAddress: z.string().optional(),
  isOnline: z.boolean().default(false),
  mode: z.enum(['online', 'offline', 'hybrid']).default('offline'),
  tags: z.array(z.string()).min(1, 'Select at least 1 tag').max(5, 'Maximum 5 tags'),
  registerUrl: z.string().url('Must be a valid registration URL'),
  organizer: z.string().min(2, 'Organizer name is required'),
  organization: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  minTeamSize: z.number().int().min(1).default(1),
  maxTeamSize: z.number().int().min(1).default(4),
  soloAllowed: z.boolean().default(true),
  eligibility: z.string().optional(),
  prizePool: z.string().optional(),
  registrationFee: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Invalid contact email'),
  contactPhone: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialDiscord: z.string().optional(),
  socialInstagram: z.string().optional()
});

export const editHackathonSchema = submitHackathonSchema.partial().extend({
  id: z.string().min(1, 'Hackathon ID is required')
});

export type SubmitHackathonInput = z.infer<typeof submitHackathonSchema>;
export type EditHackathonInput = z.infer<typeof editHackathonSchema>;
