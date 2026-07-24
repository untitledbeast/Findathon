import { env } from './env';

export const appConfig = {
  name: 'Findathon',
  version: '1.0.0',
  apiVersion: 'v1',
  description: 'The Unified Discovery Engine & AI Search Platform for Hackathons',
  baseUrl: env.NEXT_PUBLIC_APP_URL,
  isProduction: env.NODE_ENV === 'production',
  defaultLocale: 'en',
  defaultTimezone: 'UTC'
};
