import { createFileRoute } from "@tanstack/react-router";
import { apiError, handlePublicApi } from "@/server/apiAuth.server";

export const Route = createFileRoute("/api/public/v1/clusters")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handlePublicApi(request, "/v1/clusters", async () => {
          return apiError(
            "not_found",
            "Cluster analysis is not yet available — coming soon. Use /v1/insider for raw Form 4 data.",
            501
          );
        }),
    },
  },
});
