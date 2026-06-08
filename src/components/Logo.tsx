// SECStream logo — inline SVG so it picks up text color via currentColor.
//
// Two left chevrons (filings flowing in) → central swirl (the API transforming
// them) → two right chevrons (clean structured data flowing out).
//
// Usage:
//   <Logo />                       // 24px, primary color (default)
//   <Logo size={32} />             // 32px square
//   <Logo className="text-white" />// override color via Tailwind
//   <Logo withWordmark />          // icon + "SECStream" text

import { cn } from "@/lib/utils";

export function Logo({
  size = 24,
  className,
  withWordmark = false,
}: {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="SECStream"
        role="img"
      >
        {/* Left chevrons */}
        <path d="M10 24 L4 32 L10 40" />
        <path d="M20 24 L14 32 L20 40" />
        {/* Central swirl */}
        <path d="M26 40 C 30 36, 30 28, 26 24" />
        <path d="M38 24 C 34 28, 34 36, 38 40" />
        <circle cx="32" cy="32" r="2.5" fill="currentColor" stroke="none" />
        {/* Right chevrons */}
        <path d="M44 24 L50 32 L44 40" />
        <path d="M54 24 L60 32 L54 40" />
      </svg>
      {withWordmark && (
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          SECStream
        </span>
      )}
    </span>
  );
}
