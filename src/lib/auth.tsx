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
  lastUsedAt: string | null;
  createdAt: string;
};

type AuthContextValue = {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  apiKey: ApiKey | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: prof }, { data: keys }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (prof) {
      setProfile({
        id: prof.id,
        email: prof.email,
        plan: (prof.plan as Profile["plan"]) ?? "active",
        renewalDate: prof.renewal_date,
      });
    }
    const k = keys?.[0];
    if (k) {
      setApiKey({
        id: k.id,
        keyPlaintext: k.key_plaintext,
        keyPrefix: k.key_prefix,
        keyLast4: k.key_last4,
        label: k.label,
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
      });
    } else {
      setApiKey(null);
    }
  }, []);

  useEffect(() => {
    // Listener FIRST, then session check (Supabase recommendation)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlock per Supabase docs
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setApiKey(null);
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

  const regenerateKey = useCallback(async () => {
    if (!user) throw new Error("Not signed in");
    const newKey = generateApiKey();
    const hash = await sha256Hex(newKey);
    // Delete existing keys, insert new one (simple single-key model for now)
    await supabase.from("api_keys").delete().eq("user_id", user.id);
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_plaintext: newKey,
        key_hash: hash,
        key_prefix: newKey.slice(0, 11),
        key_last4: newKey.slice(-4),
        label: "Default",
      })
      .select()
      .single();
    if (error) throw error;
    setApiKey({
      id: data.id,
      keyPlaintext: data.key_plaintext,
      keyPrefix: data.key_prefix,
      keyLast4: data.key_last4,
      label: data.label,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
    });
  }, [user]);

  const refresh = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, apiKey, loading, signup, login, logout, regenerateKey, refresh }}
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
