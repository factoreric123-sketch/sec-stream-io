import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — SECStream" },
      {
        name: "description",
        content:
          "SECStream Privacy Policy: what data we collect, how it's used, sub-processors (Supabase, Stripe), and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — SECStream" },
      {
        property: "og:description",
        content: "How SECStream collects and handles data.",
      },
      { property: "og:url", content: "https://sec-filing-api.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://sec-filing-api.com/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-foreground">
      <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: June 12, 2026</p>

      <section className="prose prose-invert mt-8 space-y-6 text-muted-foreground">
        <p>
          This Policy describes what data SECStream ("we") collects when you use{" "}
          <span className="text-foreground">sec-filing-api.com</span> and the SECStream API.
        </p>

        <h2 className="text-lg font-semibold text-foreground">1. Data we collect</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="text-foreground">Account data:</span> email address and a hashed
            password (we never see your plaintext password).
          </li>
          <li>
            <span className="text-foreground">Billing data:</span> Stripe customer ID and
            subscription status. Card details are handled and stored by Stripe — we never see
            them.
          </li>
          <li>
            <span className="text-foreground">Usage logs:</span> timestamp, endpoint, response
            status, and latency for each API call, used for rate limiting, debugging, and billing.
          </li>
          <li>
            <span className="text-foreground">IP address:</span> recorded transiently for abuse
            prevention and rate limiting.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">2. How we use it</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Operating, securing, and improving the Service.</li>
          <li>Enforcing rate limits and detecting abuse.</li>
          <li>Sending account, billing, and security email.</li>
        </ul>
        <p>We do not sell your data and we do not show ads.</p>

        <h2 className="text-lg font-semibold text-foreground">3. Sub-processors</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="text-foreground">Supabase</span> — authentication and database
            hosting.
          </li>
          <li>
            <span className="text-foreground">Stripe</span> — payment processing and billing.
          </li>
          <li>
            <span className="text-foreground">Cloudflare</span> — DNS, CDN, and DDoS protection.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">4. Retention</h2>
        <p>
          Account data is kept while your account is active. Usage logs are retained for 90 days
          and then aggregated or deleted. You can request account deletion at any time.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Your rights (GDPR / CCPA)</h2>
        <p>
          You may request access, correction, export, or deletion of your personal data by
          emailing <span className="text-foreground">privacy@sec-filing-api.com</span>. We
          respond within 30 days.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Security</h2>
        <p>
          Data is encrypted in transit (TLS) and at rest. API keys are stored hashed (SHA-256);
          we cannot recover a lost key — you must generate a new one.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
        <p>
          Questions: <span className="text-foreground">privacy@sec-filing-api.com</span>
        </p>
      </section>
    </div>
  );
}
