import { useEffect, useState } from "react";
import { Check, Copy, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "secstream.onboarding.dismissed";

export function OnboardingWizard({
  apiKey,
  userId,
}: {
  apiKey: string | null;
  userId: string;
}) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [requestCount, setRequestCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  // Poll usage_logs once we hit step 3 to detect the user's first call.
  useEffect(() => {
    if (step !== 3 || dismissed) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const since = new Date(Date.now() - 10 * 60_000).toISOString();
      const { count } = await supabase
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);
      if (!alive) return;
      setRequestCount(count ?? 0);
      timer = setTimeout(tick, 4000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [step, userId, dismissed]);

  if (dismissed || !apiKey) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const curl = `curl -H "Authorization: Bearer ${apiKey}" \\
  "https://sec-stream-io.lovable.app/api/public/v1/filings?ticker=AAPL&limit=3"`;

  return (
    <section className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-lg">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Make your first API call
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              3 quick steps · about 60 seconds
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss} title="Skip">
          <X />
        </Button>
      </div>

      <div className="px-6 pt-4">
        <Stepper step={step} />
      </div>

      <div className="p-6 pt-4">
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Copy your API key.</strong> You'll send this in the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                Authorization
              </code>{" "}
              header.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 p-3">
              <code className="flex-1 truncate font-mono text-xs text-foreground/80">
                {apiKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey}>
                {copied ? <Check className="text-success" /> : <Copy />}
                {copied ? "Copied" : "Copy key"}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setStep(2)} disabled={!copied}>
                {copied ? "Next" : "Copy key first"} <ArrowRight />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Run this curl in your terminal.</strong> It fetches Apple's
              latest 3 SEC filings.
            </p>
            <CodeBlock language="bash" code={curl} />
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="sm" onClick={() => setStep(3)}>
                I ran it <ArrowRight />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>See it land in your usage.</strong> We're watching for your
              first request below.
            </p>
            <div className="rounded-md border border-border bg-background/40 p-4">
              {requestCount === null ? (
                <p className="font-mono text-xs text-muted-foreground animate-pulse-slow">
                  Listening for requests…
                </p>
              ) : requestCount > 0 ? (
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success" />
                  <span>
                    Got it — <strong>{requestCount}</strong> request{requestCount > 1 ? "s" : ""} in the last 10 minutes. You're live.
                  </span>
                </div>
              ) : (
                <p className="font-mono text-xs text-muted-foreground animate-pulse-slow">
                  Waiting… run the curl above. Stats appear within ~5s.
                </p>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button size="sm" onClick={dismiss} variant={requestCount && requestCount > 0 ? "default" : "outline"}>
                {requestCount && requestCount > 0 ? "Done" : "Skip for now"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Copy key", "Run curl", "See usage"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] ${
                done
                  ? "bg-success/30 text-success"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : n}
            </div>
            <span
              className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {n < labels.length && <div className="ml-1 h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
