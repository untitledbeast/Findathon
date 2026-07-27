import { z } from 'zod';

export const SubmissionPublishedV1Schema = z.object({
  submissionId: z.string(),
  hackathonId: z.string(),
  title: z.string(),
  userId: z.string(),
  publishedAt: z.string()
});

export const SearchReindexRequestedV1Schema = z.object({
  hackathonId: z.string(),
  action: z.enum(['upsert', 'delete']),
  timestamp: z.string()
});

export const NotificationRequestedV1Schema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  payload: z.record(z.string(), z.unknown()).optional()
});

export const EventRegistry = {
  'SubmissionPublishedIntegrationEvent.v1': SubmissionPublishedV1Schema,
  'SearchReindexRequestedIntegrationEvent.v1': SearchReindexRequestedV1Schema,
  'NotificationRequestedIntegrationEvent.v1': NotificationRequestedV1Schema,
} as const;

export type EventRegistryType = typeof EventRegistry;
