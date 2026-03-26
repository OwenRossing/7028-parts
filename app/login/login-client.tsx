"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserSummary } from "@/types";
import { Providers } from "@/components/providers";

interface LoginClientProps {
  appMode: "demo" | "local" | "production";
  googleClientId: string | null;
  googleAuthDomain: string | null;
}

function LoginForm({ appMode, googleClientId, googleAuthDomain }: LoginClientProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [masterKey, setMasterKey] = useState("");
  const [masterKeyVerified, setMasterKeyVerified] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showLocal = appMode === "local" || appMode === "demo";
  const showGoogle = (appMode === "production" || appMode === "demo") && !!googleClientId;

  const usersQuery = useQuery<{ users: UserSummary[] }>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    enabled: masterKeyVerified,
  });

  const localLogin = useMutation({
    mutationFn: async ({ userId, masterKey }: { userId: string; masterKey: string }) => {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, masterKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      router.push("/");
    },
    onError: (e: Error) => setError(e.message),
  });

  async function verifyMasterKey() {
    setError(null);
    // Verify key by attempting to list users with it
    const res = await fetch("/api/users", {
      headers: { Cookie: document.cookie },
    });
    // We can't verify the key server-side without a real session.
    // Instead, just try to log in with a placeholder and see if the key works.
    // Actually the simplest approach: show the user picker and let the login attempt validate.
    setMasterKeyVerified(true);
  }

  function handleLocalLogin() {
    if (!selectedUserId) { setError("Select a user."); return; }
    setError(null);
    localLogin.mutate({ userId: selectedUserId, masterKey });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-ink tracking-wider mb-1">
            7028 PARTS
          </div>
          <div className="text-xs text-ink-dim uppercase tracking-widest">
            Manufacturing Tracker
          </div>
        </div>

        <div className="bg-surface-card border border-rim rounded-sm shadow-panel p-6 space-y-4">
          {error && (
            <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          {showLocal && (
            <div className="space-y-3">
              <div className="text-xs text-ink-label uppercase tracking-wider">
                {appMode === "demo" ? "Local Access" : "Sign In"}
              </div>

              {!masterKeyVerified ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Master key"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && verifyMasterKey()}
                    className="w-full bg-surface-modal border border-rim-soft rounded-sm px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-rim-brand"
                  />
                  <button
                    onClick={verifyMasterKey}
                    disabled={!masterKey}
                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-sm transition-colors"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {usersQuery.isLoading ? (
                    <div className="text-ink-dim text-xs py-2">Loading users…</div>
                  ) : (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-surface-modal border border-rim-soft rounded-sm px-3 py-2 text-sm text-ink focus:outline-none focus:border-rim-brand"
                    >
                      <option value="">Select your name…</option>
                      {usersQuery.data?.users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handleLocalLogin}
                    disabled={!selectedUserId || localLogin.isPending}
                    className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-sm transition-colors"
                  >
                    {localLogin.isPending ? "Signing in…" : "Sign In"}
                  </button>
                  <button
                    onClick={() => { setMasterKeyVerified(false); setMasterKey(""); }}
                    className="w-full text-ink-dim text-xs hover:text-ink transition-colors py-1"
                  >
                    Change key
                  </button>
                </div>
              )}
            </div>
          )}

          {showLocal && showGoogle && (
            <div className="flex items-center gap-2 text-ink-dim text-xs">
              <div className="flex-1 h-px bg-rim" />
              <span>or</span>
              <div className="flex-1 h-px bg-rim" />
            </div>
          )}

          {showGoogle && (
            <div className="space-y-2">
              {!showLocal && (
                <div className="text-xs text-ink-label uppercase tracking-wider mb-1">
                  Sign In
                  {googleAuthDomain && (
                    <span className="text-ink-dim normal-case ml-1">
                      (@{googleAuthDomain} only)
                    </span>
                  )}
                </div>
              )}
              <GoogleSignInButton clientId={googleClientId!} onError={setError} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleSignInButton({ clientId, onError }: { clientId: string; onError: (e: string) => void }) {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error google GSI types not installed
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: response.credential }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            onError(data.error ?? "Google sign-in failed");
            return;
          }
          qc.invalidateQueries({ queryKey: ["me"] });
          router.push("/");
        },
      });
      // @ts-expect-error google GSI types not installed
      window.google?.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "filled_black", size: "large", width: "100%", text: "signin_with" },
      );
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [clientId, onError, qc, router]);

  return <div id="google-signin-btn" className="w-full" />;
}

export function LoginClient(props: LoginClientProps) {
  return (
    <Providers>
      <LoginForm {...props} />
    </Providers>
  );
}
