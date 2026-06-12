// Stripe Checkout session creator.
//
// Flow:  user clicks "Subscribe" on dashboard → POST /api/public/stripe-checkout
//        → server creates Checkout session with client_reference_id = user.id
//        → returns { url } → frontend redirects to Stripe Checkout
//        → on success Stripe calls /api/public/stripe-webhook → plan flips to 'active'
//
// REQUIRED ENV VARS:
//   STRIPE_SECRET_KEY        sk_live_... or sk_test_...
//   STRIPE_PRICE_ID          price_... (the $10/mo recurring price in Stripe)
//   APP_BASE_URL             https://sec-stream-io.lovable.app (for success/cancel URLs)
//
// AUTH:
//   Reads Supabase auth from the `Authorization: Bearer <jwt>` header sent by the
//   browser after sign-in. The frontend should call this with the user's access token.

import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID   ?? "";
const APP_BASE_URL      = process.env.APP_BASE_URL      ?? "https://sec-stream-io.lovable.app";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });

export const Route = createFileRoute("/api/public/stripe-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate the user via their Supabase JWT.
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice("Bearer ".length).trim()
            : "";

          if (!token) {
            return json({ error: "Missing Authorization header" }, 401);
          }

          // Use an anon-keyed Supabase client with the user's JWT — RLS applies.
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });

          const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !user) {
            return json({ error: "Invalid or expired session" }, 401);
          }

          if (!STRIPE_PRICE_ID) {
            console.error("[stripe-checkout] STRIPE_PRICE_ID not configured");
            return json({ error: "Server not configured" }, 500);
          }

          // 2. Derive base URL from the request so preview, lovable.app, and
          //    custom domain all redirect back to the same origin the user is on.
          const origin =
            request.headers.get("origin") ||
            (request.headers.get("host")
              ? `https://${request.headers.get("host")}`
              : APP_BASE_URL);

          // 3. Create Checkout session. Stripe handles the rest.
          const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            customer_email: user.email ?? undefined,
            client_reference_id: user.id,
            success_url: `${origin}/dashboard?subscribed=1`,
            cancel_url:  `${origin}/dashboard?subscribed=0`,
            allow_promotion_codes: true,
            subscription_data: {
              metadata: { user_id: user.id },
            },
          });

          return json({ url: session.url });
        } catch (err) {
          console.error("[stripe-checkout] failed", err);
          return json({ error: "Could not create checkout session" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
