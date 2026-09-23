import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  entityName?: string;
}

export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; id: string; mode: "live" | "simulated" }> {
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: "alerts@bizhack.io",
        to: payload.to,
        subject: payload.subject,
        html: `<p>${payload.body}</p>`,
      });
      return { success: true, id: response.data?.id || "msg-sent", mode: "live" };
    } catch {
      console.warn("[Resend] Failed to send live email, falling back to simulated dispatch.");
    }
  }

  // Offline / Venue Wi-Fi Simulation Mode
  console.log(`[Notification Engine (Simulated)] -> To: ${payload.to} | Subject: ${payload.subject}`);
  return {
    success: true,
    id: `sim-${Date.now().toString().slice(-4)}`,
    mode: "simulated",
  };
}
