import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string;
  plan: "active" | "past_due" | "canceled";
  renewalDate: string;
};

export type ApiKey = {
  id: string;
  keyPlaintext: string;
  keyPrefix: string;
  keyLast4: string;
  label: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

type AuthContextValue = {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  apiKeys: ApiKey[];
  /** First (most recent) key, or null. Convenience for quickstart UI. */
  apiKey: ApiKey | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createKey: (label?: string, scopes?: string[]) => Promise<ApiKey>;
  revokeKey: (id: string) => Promise<void>;
  /** Legacy: replaces the single first key. Kept for backwards compatibility. */
  regenerateKey: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `sk_live_${hex}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: keys }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ]);

    if (prof) {
      setProfile({
        id: prof.id,
        email: prof.email,
        plan: (prof.plan as Profile["plan"]) ?? "active",
        renewalDate: prof.renewal_date,
      });
    }
    setApiKeys(
      (keys ?? []).map((k) => ({
        id: k.id,
        keyPlaintext: k.key_plaintext,
        keyPrefix: k.key_prefix,
        keyLast4: k.key_last4,
        label: k.label,
        scopes: ((k as { scopes?: string[] }).scopes) ?? ["read", "webhooks"],
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
      }))
    );
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setApiKeys([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserData(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  const signup = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const createKey = useCallback(
    async (label?: string, scopes?: string[]): Promise<ApiKey> => {
      if (!user) throw new Error("Not signed in");
      const newKey = generateApiKey();
      const hash = await sha256Hex(newKey);
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          key_plaintext: newKey,
          key_hash: hash,
          key_prefix: newKey.slice(0, 11),
          key_last4: newKey.slice(-4),
          label: label?.trim() || "Default",
          scopes: scopes && scopes.length > 0 ? scopes : ["read", "webhooks"],
        })
        .select()
        .single();
      if (error) throw error;
      const created: ApiKey = {
        id: data.id,
        keyPlaintext: data.key_plaintext,
        keyPrefix: data.key_prefix,
        keyLast4: data.key_last4,
        label: data.label,
        scopes: ((data as { scopes?: string[] }).scopes) ?? ["read", "webhooks"],
        lastUsedAt: data.last_used_at,
        createdAt: data.created_at,
      };
      setApiKeys((prev) => [created, ...prev]);
      return created;
    },
    [user]
  );

  const revokeKey = useCallback(async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) throw error;
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const regenerateKey = useCallback(async () => {
    if (!user) throw new Error("Not signed in");
    // Legacy single-key flow: delete all then create one.
    await supabase.from("api_keys").delete().eq("user_id", user.id);
    setApiKeys([]);
    await createKey("Default");
  }, [user, createKey]);

  const refresh = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  const apiKey = apiKeys[0] ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        apiKey,
        apiKeys,
        loading,
        signup,
        login,
        logout,
        createKey,
        revokeKey,
        regenerateKey,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
