// Stripe Customer Portal session.
//
// Flow:  active subscriber clicks "Manage billing" → POST /api/public/v1/billing/portal
//        → server creates a Portal session for their stripe_customer_id
//        → returns { url } → frontend redirects to Stripe-hosted portal
//        → user updates card / cancels / views invoices → Stripe returns them to return_url
//
// REQUIRED ENV VARS:
//   STRIPE_SECRET_KEY    sk_live_... or sk_test_...
//   APP_BASE_URL         https://sec-stream-io.lovable.app
//
// AUTH:
//   Same as stripe-checkout: Bearer JWT from the logged-in dashboard session.

import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const APP_BASE_URL      = process.env.APP_BASE_URL      ?? "https://sec-stream-io.lovable.app";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" });

export const Route = createFileRoute("/api/public/v1/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Authenticate.
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice("Bearer ".length).trim()
            : "";
          if (!token) return json({ error: "Missing Authorization header" }, 401);

          const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
          if (userErr || !user) return json({ error: "Invalid or expired session" }, 401);

          // 2. Look up stripe_customer_id via service-role client (RLS-bypassing).
          const { data: profile, error: profileErr } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .maybeSingle();

          if (profileErr) {
            console.error("[billing/portal] profile lookup failed", profileErr);
            return json({ error: "Internal error" }, 500);
          }
          if (!profile?.stripe_customer_id) {
            return json(
              { error: "No active subscription found. Subscribe first." },
              404,
            );
          }

          // 3. Create portal session.
          const session = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${APP_BASE_URL}/dashboard`,
          });

          return json({ url: session.url });
        } catch (err) {
          console.error("[billing/portal] failed", err);
          return json({ error: "Could not create portal session" }, 500);
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
