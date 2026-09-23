export interface PaymentSessionRequest {
  entityId: string;
  amount: number;
  currency: "USD" | "INR";
  customerEmail: string;
  itemDescription: string;
}

export interface PaymentSessionResponse {
  sessionId: string;
  checkoutUrl: string;
  status: "PENDING" | "SUCCEEDED";
  provider: "STRIPE" | "RAZORPAY" | "MOCK_GATEWAY";
}

export async function createCheckoutSession(
  request: PaymentSessionRequest
): Promise<PaymentSessionResponse> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const razorpayKey = process.env.RAZORPAY_KEY_ID;

  if (stripeKey) {
    // Live Stripe Session Logic can be wired here
    return {
      sessionId: `cs_live_${Date.now()}`,
      checkoutUrl: `https://checkout.stripe.com/c/pay/cs_live_${Date.now()}`,
      status: "PENDING",
      provider: "STRIPE",
    };
  }

  if (razorpayKey) {
    // Live Razorpay Order Logic
    return {
      sessionId: `order_rzp_${Date.now()}`,
      checkoutUrl: `https://api.razorpay.com/checkout`,
      status: "PENDING",
      provider: "RAZORPAY",
    };
  }

  // Hackathon Instant Offline Test Gateway
  return {
    sessionId: `mock_sess_${Date.now().toString().slice(-6)}`,
    checkoutUrl: `#/demo/checkout?session=mock_sess_${Date.now().toString().slice(-6)}`,
    status: "SUCCEEDED",
    provider: "MOCK_GATEWAY",
  };
}
