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
  latitude: z.number().min(-90).max(90).optional().or(z.null()),
  longitude: z.number().min(-180).max(180).optional().or(z.null()),
  isOnline: z.boolean().default(false),
  mode: z.enum(['online', 'offline', 'hybrid']).default('offline'),
  tags: z.array(z.string()).min(1, 'Select at least 1 tag').max(5, 'Maximum 5 tags'),
  registerUrl: z.string().url('Must be a valid registration URL'),
  organizer: z.string().optional().or(z.null()),
  organization: z.string().optional().or(z.null()),
  coverImageUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  minTeamSize: z.number().int().min(1).default(1),
  maxTeamSize: z.number().int().min(1).default(4),
  soloAllowed: z.boolean().default(true),
  eligibility: z.string().optional().or(z.null()),
  prizePool: z.string().optional().or(z.null()),
  registrationFee: z.string().optional().or(z.null()),
  contactName: z.string().optional().or(z.null()),
  contactEmail: z.string().email('Invalid contact email').optional().or(z.literal('')).or(z.null()),
  contactPhone: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialLinkedin: z.string().optional(),
  socialDiscord: z.string().optional(),
  socialInstagram: z.string().optional(),
  submittedBy: z.string().optional()
});

export const editHackathonSchema = submitHackathonSchema.partial().extend({
  id: z.string().min(1, 'Hackathon ID is required')
});

export type SubmitHackathonInput = z.infer<typeof submitHackathonSchema>;
export type EditHackathonInput = z.infer<typeof editHackathonSchema>;
