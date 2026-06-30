import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Endpoint not found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The route you requested doesn't exist on this server.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SECStream — SEC filings as a fast, structured API" },
      {
        name: "description",
        content:
          "Access SEC filings in seconds. Clean, structured, API-ready. $10/month, one simple plan.",
      },
      { name: "author", content: "SECStream" },
      { property: "og:title", content: "SECStream — SEC filings as a fast, structured API" },
      {
        property: "og:description",
        content: "Clean, structured SEC filings via API. $10/month flat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "SECStream — SEC filings as a fast, structured API" },
      { name: "description", content: "SECStream API provides structured SEC filing data access via a fast, clean API for developers." },
      { property: "og:description", content: "SECStream API provides structured SEC filing data access via a fast, clean API for developers." },
      { name: "twitter:description", content: "SECStream API provides structured SEC filing data access via a fast, clean API for developers." },
      { property: "og:url", content: "https://sec-filing-api.com" },
      { property: "og:site_name", content: "SECStream" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5e2f9d6e-5082-4987-92d3-d147b56e30ac/id-preview-395b2ae1--34df2433-ba15-4eb5-9687-7e6b0d11b0c0.lovable.app-1777591783313.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5e2f9d6e-5082-4987-92d3-d147b56e30ac/id-preview-395b2ae1--34df2433-ba15-4eb5-9687-7e6b0d11b0c0.lovable.app-1777591783313.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
