import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Mock auth — swap for Supabase later. Stored in localStorage so it survives refresh.
export type User = {
  id: string;
  email: string;
  apiKey: string;
  createdAt: string;
  plan: "active" | "past_due" | "canceled";
  renewalDate: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  regenerateKey: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "secstream:user";
const PASSWORDS_KEY = "secstream:passwords";

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `sk_live_${hex}`;
}

function loadPasswords(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PASSWORDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePasswords(p: Record<string, string>) {
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(p));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const persist = (u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
    setUser(u);
  };

  const signup = useCallback(async (email: string, password: string) => {
    const passwords = loadPasswords();
    if (passwords[email]) throw new Error("An account with that email already exists.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    passwords[email] = password;
    savePasswords(passwords);
    const renewal = new Date();
    renewal.setMonth(renewal.getMonth() + 1);
    const u: User = {
      id: crypto.randomUUID(),
      email,
      apiKey: generateApiKey(),
      createdAt: new Date().toISOString(),
      plan: "active",
      renewalDate: renewal.toISOString(),
    };
    persist(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const passwords = loadPasswords();
    if (!passwords[email] || passwords[email] !== password) {
      throw new Error("Invalid email or password.");
    }
    // Reuse existing user record if we have one matching, else build one
    const raw = localStorage.getItem(STORAGE_KEY);
    let existing: User | null = null;
    try { existing = raw ? JSON.parse(raw) : null; } catch { /* noop */ }
    if (existing && existing.email === email) {
      persist(existing);
      return;
    }
    const renewal = new Date();
    renewal.setMonth(renewal.getMonth() + 1);
    persist({
      id: crypto.randomUUID(),
      email,
      apiKey: generateApiKey(),
      createdAt: new Date().toISOString(),
      plan: "active",
      renewalDate: renewal.toISOString(),
    });
  }, []);

  const logout = useCallback(() => persist(null), []);

  const regenerateKey = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, apiKey: generateApiKey() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, regenerateKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
