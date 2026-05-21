import { createFileRoute } from "@tanstack/react-router";
import { apiError, handlePublicApi } from "@/server/apiAuth.server";

export const Route = createFileRoute("/api/public/v1/fundamentals")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/fundamentals", async () => {
          return apiError(
            "not_found",
            "Fundamentals data is not yet available — coming soon. Use /v1/filings for 10-K and 10-Q metadata.",
            501
          );
        }),
    },
  },
});
