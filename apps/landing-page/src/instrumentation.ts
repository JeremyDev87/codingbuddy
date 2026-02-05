export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    console.log('[Instrumentation] Server runtime registered');

    // Future: Add OpenTelemetry, Sentry server-side initialization
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    console.log('[Instrumentation] Edge runtime registered');
  }
}
