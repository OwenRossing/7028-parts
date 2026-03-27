"use client";

/**
 * SCADA AMBER — Login Card
 * Clean centered panel. No terminal theatrics.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserSummary } from "@/types";

interface ScadaLoginCardProps {
  appMode: "demo" | "local" | "production";
  googleClientId: string | null;
  googleAuthDomain: string | null;
}

export function ScadaLoginCard({
  appMode,
  googleClientId,
  googleAuthDomain,
}: ScadaLoginCardProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [masterKey, setMasterKey] = useState("");
  const [masterKeyVerified, setMasterKeyVerified] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const showLocal = appMode === "local" || appMode === "demo";
  const showGoogle =
    (appMode === "production" || appMode === "demo") && !!googleClientId;

  const usersQuery = useQuery<{ users: UserSummary[] }>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    enabled: masterKeyVerified,
  });

  const localLogin = useMutation({
    mutationFn: async ({
      userId,
      masterKey,
    }: {
      userId: string;
      masterKey: string;
    }) => {
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

  function verifyMasterKey() {
    setError(null);
    setMasterKeyVerified(true);
  }

  function handleLocalLogin() {
    if (!selectedUserId) {
      setError("SELECT AN OPERATOR.");
      return;
    }
    setError(null);
    localLogin.mutate({ userId: selectedUserId, masterKey });
  }

  return (
    <div className="sa-login-bg">
      <div className="sa-login-card">
        {/* Header */}
        <div className="sa-login-logo">
          <div className="sa-login-logo-text">7028 PARTS TRACKER</div>
          <div className="sa-login-logo-sub">
            SELECT OPERATOR
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="sa-error" style={{ marginBottom: 16 }}>
            {error.toUpperCase()}
          </div>
        )}

        {/* Local / demo auth */}
        {showLocal && (
          <div style={{ marginBottom: showGoogle ? 12 : 0 }}>
            <div className="sa-form-label">
              {appMode === "demo" ? "LOCAL ACCESS" : "OPERATOR LOGIN"}
            </div>

            {!masterKeyVerified ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="password"
                  placeholder="MASTER KEY..."
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verifyMasterKey()}
                  className="sa-input"
                  autoFocus
                />
                <button
                  onClick={verifyMasterKey}
                  disabled={!masterKey}
                  className="sa-btn-primary"
                >
                  AUTHENTICATE
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {usersQuery.isLoading ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--sa-amber-600)",
                      letterSpacing: "0.12em",
                      padding: "8px 0",
                    }}
                  >
                    LOADING OPERATORS...
                  </div>
                ) : (
                  <div className="sa-user-list">
                    {usersQuery.data?.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`sa-user-item${selectedUserId === u.id ? " sa-user-item--selected" : ""}`}
                      >
                        {u.displayName.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleLocalLogin}
                  disabled={!selectedUserId || localLogin.isPending}
                  className="sa-btn-primary"
                >
                  {localLogin.isPending ? "AUTHENTICATING..." : "SIGN IN"}
                </button>

                <button
                  onClick={() => {
                    setMasterKeyVerified(false);
                    setMasterKey("");
                  }}
                  className="sa-btn-secondary"
                >
                  BACK
                </button>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {showLocal && showGoogle && (
          <div className="sa-divider">OR</div>
        )}

        {/* Google OAuth */}
        {showGoogle && (
          <div>
            {!showLocal && (
              <div className="sa-form-label" style={{ marginBottom: 8 }}>
                GOOGLE AUTH
                {googleAuthDomain && (
                  <span
                    style={{
                      color: "var(--sa-amber-700)",
                      textTransform: "none",
                      marginLeft: 4,
                    }}
                  >
                    (@{googleAuthDomain})
                  </span>
                )}
              </div>
            )}
            <ScadaGoogleButton
              clientId={googleClientId!}
              onError={(e) => setError(e)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Google sign-in button wrapper ───────────────────────────────────────────

function ScadaGoogleButton({
  clientId,
  onError,
}: {
  clientId: string;
  onError: (e: string) => void;
}) {
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
        document.getElementById("sa-google-signin-btn"),
        {
          theme: "filled_black",
          size: "large",
          width: "100%",
          text: "signin_with",
        },
      );
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [clientId, onError, qc, router]);

  return (
    <div>
      <div className="sa-form-label" style={{ marginBottom: 6 }}>
        GOOGLE SIGN-IN
      </div>
      <div
        style={{
          border: "1px solid var(--sa-border-lit)",
          padding: 4,
        }}
      >
        <div id="sa-google-signin-btn" className="w-full" />
      </div>
    </div>
  );
}
