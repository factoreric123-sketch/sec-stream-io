import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — SECStream" },
      {
        name: "description",
        content:
          "SECStream Terms of Service: acceptable use, billing, cancellation, and liability for the SEC filings API.",
      },
      { property: "og:title", content: "Terms of Service — SECStream" },
      {
        property: "og:description",
        content: "Terms governing use of the SECStream SEC filings API.",
      },
      { property: "og:url", content: "https://sec-filing-api.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://sec-filing-api.com/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-foreground">
      <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: June 12, 2026</p>

      <section className="prose prose-invert mt-8 space-y-6 text-muted-foreground">
        <p>
          These Terms govern your use of the SECStream API and website at{" "}
          <span className="text-foreground">sec-filing-api.com</span> ("Service"). By creating an
          account or using the Service, you agree to these Terms.
        </p>

        <h2 className="text-lg font-semibold text-foreground">1. The Service</h2>
        <p>
          SECStream provides programmatic access to U.S. Securities and Exchange Commission
          ("SEC") filings via a REST API. The underlying filings are public records published by
          the SEC; we provide structuring, normalization, search, and delivery.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Accounts</h2>
        <p>
          You must provide a valid email and keep your API keys confidential. You are responsible
          for all activity under your account and keys.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. Billing</h2>
        <p>
          The Service is offered on a recurring subscription of US $10 per month, billed in
          advance via Stripe. Subscriptions renew automatically until canceled. You can cancel any
          time from the dashboard; cancellation takes effect at the end of the current billing
          period. Partial months are not refunded.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Do not exceed published rate limits or attempt to circumvent them.</li>
          <li>Do not resell or redistribute raw API responses as a competing data feed.</li>
          <li>Do not use the Service for illegal activity or to mislead investors.</li>
          <li>Do not attempt to attack, probe, or reverse-engineer the Service.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate this section, with or without notice.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
        <p>
          The underlying SEC filings are in the public domain. The Service software, structure,
          and presentation are owned by SECStream. You retain ownership of anything you build on
          top of the API.
        </p>

        <h2 className="text-lg font-semibold text-foreground">6. Disclaimer</h2>
        <p>
          The Service is provided "as is" without warranty of any kind. SEC filings may contain
          errors; we do not guarantee accuracy, completeness, or timeliness. Nothing returned by
          the API is investment advice.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, SECStream's total liability for any claim
          arising out of the Service is limited to the amount you paid us in the twelve months
          before the claim.
        </p>

        <h2 className="text-lg font-semibold text-foreground">8. Changes</h2>
        <p>
          We may update these Terms. Material changes will be announced via email or on the
          dashboard at least 14 days before they take effect.
        </p>

        <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
        <p>
          Questions: <span className="text-foreground">support@sec-filing-api.com</span>
        </p>
      </section>
    </div>
  );
}
