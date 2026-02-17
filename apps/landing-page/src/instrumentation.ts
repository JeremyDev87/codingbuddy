export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    // Future: Add OpenTelemetry, Sentry server-side initialization
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
  }
}
