export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: string;
}

export function trackEvent(event: AnalyticsEvent) {
  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (postHogKey && typeof window !== "undefined") {
    // PostHog browser telemetry logic
    console.log(`[PostHog Telemetry] Event: ${event.eventName}`, event.properties);
    return;
  }

  // Local Telemetry Engine
  console.log(`[Local Analytics Tracker] Event: ${event.eventName}`, {
    ...event.properties,
    timestamp: new Date().toISOString(),
  });
}
