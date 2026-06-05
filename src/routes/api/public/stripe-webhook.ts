// Stripe webhook handler.
//
// Stripe → POST /api/public/stripe-webhook → verify signature → update profiles.plan.
//
// REQUIRED ENV VARS (set in Lovable/deploy environment, NOT in .env in git):
//   STRIPE_SECRET_KEY        sk_live_... or sk_test_...
//   STRIPE_WEBHOOK_SECRET    whsec_...   (from Stripe dashboard → Webhooks → Endpoint signing secret)
//
// SETUP IN STRIPE:
//   1. Dashboard → Developers → Webhooks → Add endpoint
//   2. URL: https://sec-stream-io.lovable.app/api/public/stripe-webhook
//   3. Events:
//        - checkout.session.completed
//        - customer.subscription.updated
//        - customer.subscription.deleted
//        - invoice.payment_failed
//        - invoice.payment_succeeded
//   4. Copy signing secret → set STRIPE_WEBHOOK_SECRET
//
// DEPENDENCY: requires `stripe` npm package. Install:
//   bun add stripe       (or `npm install stripe`)

import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY     ?? "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
});

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Read raw body (NOT request.json() — signature verification needs raw bytes).
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return json({ error: "Missing stripe-signature header" }, 400);
        }
        if (!STRIPE_WEBHOOK_SECRET) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
          return json({ error: "Server not configured" }, 500);
        }

        // 2. Verify signature.
        let event: Stripe.Event;
        try {
          event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
          console.error("[stripe-webhook] signature verification failed", err);
          return json({ error: "Invalid signature" }, 400);
        }

        // 3. Idempotency: Stripe retries on non-2xx, can deliver same event twice.
        const { error: dedupErr } = await supabaseAdmin
          .from("stripe_events")
          .insert({ event_id: event.id, type: event.type });

        if (dedupErr) {
          // 23505 = unique_violation = already processed. Return 200 so Stripe stops retrying.
          if (dedupErr.code === "23505") {
            return json({ received: true, replayed: true });
          }
          console.error("[stripe-webhook] dedupe insert failed", dedupErr);
          // Continue anyway — better to risk double-processing than to drop the event.
        }

        // 4. Dispatch.
        try {
          switch (event.type) {
            case "checkout.session.completed":
              await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
              break;

            case "customer.subscription.updated":
            case "customer.subscription.deleted":
              await onSubscriptionChanged(event.data.object as Stripe.Subscription);
              break;

            case "invoice.payment_failed":
              await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
              break;

            case "invoice.payment_succeeded":
              await onInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
              break;

            default:
              // Acknowledged but ignored — Stripe sends a lot of event types.
              break;
          }
        } catch (err) {
          console.error(`[stripe-webhook] handler for ${event.type} failed`, err);
          return json({ error: "Handler failed" }, 500);
        }

        return json({ received: true });
      },
    },
  },
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  // user_id is passed as client_reference_id when creating the session.
  const userId = session.client_reference_id;
  if (!userId) {
    console.error("[stripe-webhook] checkout.session.completed missing client_reference_id", session.id);
    return;
  }

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id ?? null;

  // Pull the subscription to learn its current_period_end (for renewal_date).
  let renewalDate: string | null = null;
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      renewalDate = toIso((sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end);
    } catch (err) {
      console.error("[stripe-webhook] failed to retrieve subscription", err);
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      ...(renewalDate ? { renewal_date: renewalDate } : {}),
    })
    .eq("id", userId);

  if (error) {
    console.error("[stripe-webhook] profile update failed", error);
    throw error;
  }
}

async function onSubscriptionChanged(sub: Stripe.Subscription) {
  // Look up user via stripe_customer_id (more reliable than re-reading from metadata).
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const plan = mapSubscriptionStatus(sub.status);
  const renewalDate = toIso((sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan,
      stripe_subscription_id: sub.id,
      ...(renewalDate ? { renewal_date: renewalDate } : {}),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe-webhook] subscription update failed", error);
    throw error;
  }
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "past_due" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe-webhook] payment_failed update failed", error);
    throw error;
  }
}

async function onInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Payment recovered → flip back to active.
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  if (invoice.billing_reason !== "subscription_cycle" && invoice.billing_reason !== "subscription_create") {
    return;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "active" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe-webhook] payment_succeeded update failed", error);
    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
      return "incomplete";
    default:
      return status;
  }
}

function toIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
