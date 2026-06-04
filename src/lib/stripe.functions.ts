import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

const PRO_PRICE_ID = "price_1TeVlEA5UN3d5T9yfSUeC75g";

export const createProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key);

    const origin =
      getRequestHeader("origin") ||
      `https://${getRequestHeader("host") ?? "localhost"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      customer_email: context.claims?.email as string | undefined,
      client_reference_id: context.userId,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  });
