export const rateLimitsConfig = {
  anonymous: {
    limit: 60,
    windowMs: 60000 // 60 requests per minute
  },
  authenticated: {
    limit: 180,
    windowMs: 60000 // 180 requests per minute
  },
  organizer: {
    limit: 300,
    windowMs: 60000 // 300 requests per minute
  },
  submitHackathon: {
    limit: 5,
    windowMs: 3600000 // 5 submissions per hour
  },
  writeReview: {
    limit: 10,
    windowMs: 86400000 // 10 reviews per day
  }
};
