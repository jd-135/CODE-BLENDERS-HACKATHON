export interface AutomationEvent {
  event: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function dispatchAutomationWebhook(
  event: AutomationEvent
): Promise<{ dispatched: boolean; target: string }> {
  const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL; // n8n or Zapier endpoint

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      return { dispatched: true, target: webhookUrl };
    } catch {
      console.warn("[Automation] Remote webhook dispatch failed, recorded locally.");
    }
  }

  // Local Offline Simulation
  console.log(`[Automation Engine (Local Dispatch)] -> Event: ${event.event}`, event.payload);
  return { dispatched: true, target: "local-event-bus" };
}
