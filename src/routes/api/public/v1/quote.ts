import { createFileRoute } from "@tanstack/react-router";
import { apiError, handlePublicApi } from "@/server/apiAuth.server";

export const Route = createFileRoute("/api/public/v1/quote")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/quote", async () => {
          return apiError(
            "not_found",
            "Market quote data is not yet available — coming soon.",
            501
          );
        }),
    },
  },
});
