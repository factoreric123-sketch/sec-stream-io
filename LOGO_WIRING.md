# Logo Wiring Guide

What's been added, and the exact 4 file edits needed to wire the SECStream
logo into the site. Paste these into Lovable as one prompt, or apply by hand.

## What's already in the repo

| File | Purpose |
|---|---|
| `public/logo.svg` | Standalone SVG (uses `currentColor`, sized 64×64 viewBox) |
| `public/favicon.svg` | Compact 5-element version optimized for 16–32px browser tabs |
| `src/components/Logo.tsx` | React component: `<Logo />` with `size`, `className`, `withWordmark` props |

## Visual concept

Two left chevrons → central swirl → two right chevrons.

Reads as: SEC filings flowing in (chevrons), getting transformed by the API
(swirl/funnel), structured data flowing out (chevrons). Mirrors your screenshot
exactly but as inline SVG so it picks up theme color via `currentColor`.

---

## Edit 1 — `src/components/SiteHeader.tsx`

Replace the `§` placeholder with the `<Logo>` component.

**At the top, add the import:**
```tsx
import { Logo } from "@/components/Logo";
```

**Replace lines 22–27:**
```tsx
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
            §
          </span>
          <span>SECStream</span>
        </Link>
```

**With:**
```tsx
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
          <Logo size={24} />
          <span>SECStream</span>
        </Link>
```

---

## Edit 2 — `src/routes/__root.tsx`

Add favicon `<link>` tags so the icon shows in browser tabs.

**Inside the `links: [...]` array, add:**
```tsx
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
```

Right after the existing `appCss` line is fine. The order looks like:
```tsx
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      // ... rest unchanged
    ],
```

**Optional:** convert `favicon.svg` → `favicon.png` (256×256) for older browsers.
Drop the PNG in `public/favicon.png`. Any free SVG→PNG tool works
(e.g. `https://cloudconvert.com/svg-to-png`).

---

## Edit 3 — `src/routes/index.tsx` (home page hero)

Add a large version of the logo to the hero section, above the headline.

**At the top of `index.tsx`, add the import:**
```tsx
import { Logo } from "@/components/Logo";
```

**In whatever hero block exists, above the `<h1>`, add:**
```tsx
<div className="mb-6 flex justify-center">
  <Logo size={64} className="text-primary" />
</div>
```

If the hero is left-aligned, drop the `flex justify-center` wrapper and
just put `<Logo size={64} />` inline.

---

## Edit 4 — `src/routes/login.tsx` (auth pages)

Add the logo above the form on login + signup. Signup already imports
`AuthShell` from login, so editing login covers both.

**At the top of `login.tsx`, add the import:**
```tsx
import { Logo } from "@/components/Logo";
```

**Inside the `AuthShell` component, above the `<h1>` / title, add:**
```tsx
<div className="mb-4 flex justify-center">
  <Logo size={40} />
</div>
```

---

## Verification

After applying all 4 edits and redeploying:

1. **Header** — visit `/`. The `§` placeholder is gone, replaced by the new
   chevron-swirl icon next to "SECStream".
2. **Browser tab** — the favicon should be the green chevron icon, not
   the default `?`.
3. **Home hero** — large logo centered above the headline on `/`.
4. **Login/signup** — logo above the "Create your account" form.
5. **Dark/light mode** — logo color follows `text-primary` (mint green in
   dark mode). If you ever add light mode it will adapt automatically
   because the SVG uses `currentColor`.

## Why this approach is "natural"

- **No raster image files** — pure SVG, scales sharp at any size, ~600 bytes total
- **Theme-aware** — uses `currentColor` so it matches `text-primary` everywhere
- **Single source of truth** — change `src/components/Logo.tsx` once, updates everywhere
- **No font loading** — the icon doesn't depend on Inter / JetBrains Mono
- **Accessible** — has `aria-label="SECStream"` for screen readers

## Future polish (do later)

- Add a `Logo` variant with no wordmark for tight spaces (dashboard sidebar)
- Generate an OpenGraph preview image: 1200×630 PNG with the logo + tagline,
  upload to Lovable/R2, swap the `og:image` URL in `__root__.tsx`
- Animate the swirl on hover for marketing pages (subtle, optional)
