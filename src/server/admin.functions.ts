// Admin-only server functions. Gated by ADMIN_EMAILS allowlist.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_EMAILS } from "@/lib/admin";

function assertAdmin(claims: { email?: string }) {
  const email = claims?.email?.toLowerCase();
  const allowed = ADMIN_EMAILS.map((e) => e.toLowerCase());
  if (!email || !allowed.includes(email)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as { email?: string });

    const now = Date.now();
    const day = new Date(now - 24 * 3600 * 1000).toISOString();
    const week = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

    const [users, profiles, calls24h, calls7d, calls30d, recentSignups, topUsersRaw, topEndpointsRaw, recentErrors] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("profiles").select("plan"),
        supabaseAdmin.from("usage_logs").select("id", { count: "exact", head: true }).gte("created_at", day),
        supabaseAdmin.from("usage_logs").select("id", { count: "exact", head: true }).gte("created_at", week),
        supabaseAdmin.from("usage_logs").select("id", { count: "exact", head: true }).gte("created_at", month),
        supabaseAdmin
          .from("profiles")
          .select("id,email,created_at,plan")
          .order("created_at", { ascending: false })
          .limit(10),
        supabaseAdmin
          .from("usage_logs")
          .select("user_id")
          .gte("created_at", week)
          .limit(10000),
        supabaseAdmin
          .from("usage_logs")
          .select("endpoint")
          .gte("created_at", week)
          .limit(10000),
        supabaseAdmin
          .from("usage_logs")
          .select("user_id,endpoint,status,created_at,latency_ms")
          .gte("status", 400)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    const planCounts: Record<string, number> = {};
    for (const p of profiles.data ?? []) planCounts[p.plan] = (planCounts[p.plan] ?? 0) + 1;

    const userCounts: Record<string, number> = {};
    for (const r of topUsersRaw.data ?? []) userCounts[r.user_id] = (userCounts[r.user_id] ?? 0) + 1;
    const topUserIds = Object.entries(userCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const { data: topUserProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email")
      .in("id", topUserIds.map(([id]) => id));
    const emailById = new Map((topUserProfiles ?? []).map((p) => [p.id, p.email]));
    const topUsers = topUserIds.map(([id, count]) => ({
      user_id: id,
      email: emailById.get(id) ?? "—",
      count,
    }));

    const endpointCounts: Record<string, number> = {};
    for (const r of topEndpointsRaw.data ?? []) endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] ?? 0) + 1;
    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totals: {
        users: users.count ?? 0,
        active: planCounts.active ?? 0,
        past_due: planCounts.past_due ?? 0,
        canceled: planCounts.canceled ?? 0,
        calls24h: calls24h.count ?? 0,
        calls7d: calls7d.count ?? 0,
        calls30d: calls30d.count ?? 0,
      },
      recentSignups: recentSignups.data ?? [],
      topUsers,
      topEndpoints,
      recentErrors: recentErrors.data ?? [],
    };
  });
