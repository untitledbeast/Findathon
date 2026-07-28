export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SENTRY_DSN) {
    const { initSentry } = await import('./lib/monitoring/sentry');
    initSentry();
  }
}
