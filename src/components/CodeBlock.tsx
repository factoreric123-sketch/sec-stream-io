import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
};

export function CodeBlock({ code, language, filename, className }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn("code-block overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="dot bg-destructive/70" />
          <span className="dot bg-[oklch(0.78_0.15_85)]/70" />
          <span className="dot bg-success/70" />
          {filename && (
            <span className="ml-3 text-xs text-muted-foreground">{filename}</span>
          )}
          {language && !filename && (
            <span className="ml-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              {language}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
