"use client";

/**
 * Android 17 / Material 3 Expressive — Login Card
 *
 * Design pattern: Full-bleed adaptive color background (derived from team
 * brand color), with a frosted glass surface-container card centered on top.
 *
 * Key MD3 Expressive characteristics:
 *  - Adaptive color gradient background from primary seed (#006EB5)
 *  - Frosted glass card — NOT solid, tinted with primary at low opacity
 *  - Filled tonal buttons (secondary-container / on-secondary-container)
 *  - User list items use MD3 List with leading monogram avatars
 *  - No border-radius less than 12dp on any interactive element
 *  - Type scale follows MD3 exactly (title-large for card heading)
 *
 * This is a pure presentational component. It receives the same props as
 * LoginForm in app/login/login-client.tsx and wraps the existing logic.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserSummary } from "@/types";

// ── Monogram avatar ──────────────────────────────────────────────────────────

function Monogram({
  name,
  size = 40,
  colorIndex = 0,
}: {
  name: string;
  size?: number;
  colorIndex?: number;
}) {
  const palettes = [
    { bg: "var(--md-sys-color-primary-container)",   fg: "var(--md-sys-color-on-primary-container)"   },
    { bg: "var(--md-sys-color-secondary-container)", fg: "var(--md-sys-color-on-secondary-container)" },
    { bg: "var(--md-sys-color-tertiary-container)",  fg: "var(--md-sys-color-on-tertiary-container)"  },
  ];
  const { bg, fg } = palettes[colorIndex % palettes.length];

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 500,
        letterSpacing: 0,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

// ── Tonal filled button ──────────────────────────────────────────────────────

function TonalButton({
  children,
  onClick,
  disabled = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: "40px",
        padding: "0 24px",
        borderRadius: "9999px",
        background: disabled
          ? "var(--md-sys-color-surface-container-highest)"
          : "var(--md-sys-color-secondary-container)",
        color: disabled
          ? "var(--md-sys-color-on-surface-variant)"
          : "var(--md-sys-color-on-secondary-container)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 500,
        letterSpacing: "0.1px",
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.38 : 1,
        transition: "box-shadow var(--a17-duration-short-4) var(--a17-motion-standard)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--a17-shadow-1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {children}
    </button>
  );
}

// ── Filled primary button (for primary CTA) ───────────────────────────────────

function FilledButton({
  children,
  onClick,
  disabled = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        height: "40px",
        padding: "0 24px",
        borderRadius: "9999px",
        background: disabled
          ? "var(--md-sys-color-surface-container-highest)"
          : "var(--md-sys-color-primary)",
        color: disabled
          ? "var(--md-sys-color-on-surface-variant)"
          : "var(--md-sys-color-on-primary)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 500,
        letterSpacing: "0.1px",
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.38 : 1,
        transition: "box-shadow var(--a17-duration-short-4) var(--a17-motion-standard)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--a17-shadow-1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {children}
    </button>
  );
}

// ── User list item ───────────────────────────────────────────────────────────

function UserListItem({
  user,
  selected,
  index,
  onClick,
}: {
  user: UserSummary;
  selected: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        width: "100%",
        minHeight: "56px",
        padding: "8px 16px",
        background: selected ? "var(--md-sys-color-secondary-container)" : "transparent",
        border: "none",
        borderRadius: selected ? "var(--a17-shape-xl)" : "var(--a17-shape-xl)",
        cursor: "pointer",
        textAlign: "left",
        transition: "background-color var(--a17-duration-short-4) var(--a17-motion-standard)",
        marginBottom: "2px",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(157,211,255,0.08)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        }
      }}
    >
      <Monogram name={user.displayName} colorIndex={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "16px",
            lineHeight: "24px",
            letterSpacing: "0.5px",
            color: selected
              ? "var(--md-sys-color-on-secondary-container)"
              : "var(--md-sys-color-on-surface)",
            fontWeight: selected ? 500 : 400,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.displayName}
        </div>
        <div
          style={{
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "0.25px",
            color: selected
              ? "var(--md-sys-color-on-secondary-container)"
              : "var(--md-sys-color-on-surface-variant)",
            opacity: 0.8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.email}
        </div>
      </div>
      {selected && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden
          style={{ color: "var(--md-sys-color-on-secondary-container)", flexShrink: 0 }}
        >
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── Google sign-in button ────────────────────────────────────────────────────

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
        document.getElementById("a17-google-signin-btn"),
        { theme: "filled_black", size: "large", width: "100%", text: "signin_with" },
      );
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [clientId, onError, qc, router]);

  return <div id="a17-google-signin-btn" style={{ width: "100%" }} />;
}

// ── Main login card component ─────────────────────────────────────────────────

interface LoginCardProps {
  appMode: "demo" | "local" | "production";
  googleClientId: string | null;
  googleAuthDomain: string | null;
}

export function Android17LoginCard({ appMode, googleClientId, googleAuthDomain }: LoginCardProps) {
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

  function verifyMasterKey() {
    setError(null);
    setMasterKeyVerified(true);
  }

  function handleLocalLogin() {
    if (!selectedUserId) { setError("Select a user."); return; }
    setError(null);
    localLogin.mutate({ userId: selectedUserId, masterKey });
  }

  return (
    /*
     * Full-screen backdrop: radial gradient from team primary color.
     * This is the "adaptive color" layer — in production this gradient
     * would be generated from the extracted primary tonal palette.
     */
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,110,181,0.30) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0,74,117,0.20) 0%, transparent 60%),
          var(--md-sys-color-surface)
        `,
      }}
    >
      {/*
       * Frosted glass card.
       * surface-container-high + backdrop-filter + primary tint inset ring.
       * Corner radius: 28dp (var(--a17-shape-xl)) — MD3 card standard.
       */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          borderRadius: "var(--a17-shape-xl)",
          background: "var(--a17-glass-high)",
          backdropFilter: "blur(var(--a17-blur-strong)) saturate(1.6)",
          WebkitBackdropFilter: "blur(var(--a17-blur-strong)) saturate(1.6)",
          border: "1px solid rgba(157,211,255,0.10)",
          boxShadow: "var(--a17-shadow-5)",
          overflow: "hidden",
        }}
      >
        {/* Card header — surface-container-highest strip */}
        <div
          style={{
            padding: "32px 24px 24px",
            background: "rgba(0,110,181,0.08)",
            borderBottom: "1px solid rgba(157,211,255,0.08)",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--a17-shape-lg)",
                background: "var(--md-sys-color-primary-container)",
                color: "var(--md-sys-color-on-primary-container)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                flexShrink: 0,
              }}
            >
              72
            </div>
            <div>
              <div
                style={{
                  fontSize: "22px",
                  lineHeight: "28px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "var(--md-sys-color-on-surface)",
                }}
              >
                7028 Parts
              </div>
              <div
                style={{
                  fontSize: "12px",
                  lineHeight: "16px",
                  letterSpacing: "0.5px",
                  color: "var(--md-sys-color-on-surface-variant)",
                  fontWeight: 500,
                }}
              >
                Manufacturing Tracker
              </div>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "24px" }}>

          {/* Error banner */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "var(--a17-shape-md)",
                background: "var(--md-sys-color-error-container)",
                color: "var(--md-sys-color-on-error-container)",
                fontSize: "14px",
                lineHeight: "20px",
                marginBottom: "16px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          {/* Local login section */}
          {showLocal && (
            <div style={{ marginBottom: showGoogle ? "0" : "0" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "var(--md-sys-color-on-surface-variant)",
                  marginBottom: "16px",
                }}
              >
                {appMode === "demo" ? "Local Access" : "Sign In"}
              </div>

              {!masterKeyVerified ? (
                /* Step 1: master key */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      placeholder="Master key"
                      value={masterKey}
                      onChange={(e) => setMasterKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && verifyMasterKey()}
                      style={{
                        width: "100%",
                        height: "56px",
                        borderRadius: "var(--a17-shape-md) var(--a17-shape-md) 0 0",
                        background: "var(--md-sys-color-surface-container-highest)",
                        color: "var(--md-sys-color-on-surface)",
                        border: "none",
                        borderBottom: `1px solid var(--md-sys-color-on-surface-variant)`,
                        padding: "0 16px",
                        fontSize: "16px",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLInputElement).style.borderBottomColor = "var(--md-sys-color-primary)";
                        (e.target as HTMLInputElement).style.borderBottomWidth = "2px";
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLInputElement).style.borderBottomColor = "var(--md-sys-color-on-surface-variant)";
                        (e.target as HTMLInputElement).style.borderBottomWidth = "1px";
                      }}
                    />
                  </div>
                  <FilledButton
                    onClick={verifyMasterKey}
                    disabled={!masterKey}
                    fullWidth
                  >
                    Continue
                  </FilledButton>
                </div>
              ) : (
                /* Step 2: user picker */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {usersQuery.isLoading ? (
                    <div
                      style={{
                        padding: "20px 0",
                        textAlign: "center",
                        fontSize: "14px",
                        color: "var(--md-sys-color-on-surface-variant)",
                      }}
                    >
                      Loading team members…
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: "var(--a17-shape-xl)",
                        background: "var(--md-sys-color-surface-container)",
                        padding: "8px",
                        maxHeight: "280px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                      className="a17-scrollable"
                    >
                      {usersQuery.data?.users.map((u, i) => (
                        <UserListItem
                          key={u.id}
                          user={u}
                          selected={selectedUserId === u.id}
                          index={i}
                          onClick={() => setSelectedUserId(u.id)}
                        />
                      ))}
                    </div>
                  )}

                  <FilledButton
                    onClick={handleLocalLogin}
                    disabled={!selectedUserId || localLogin.isPending}
                    fullWidth
                  >
                    {localLogin.isPending ? "Signing in…" : "Sign In"}
                  </FilledButton>

                  <button
                    onClick={() => { setMasterKeyVerified(false); setMasterKey(""); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--md-sys-color-primary)",
                      fontSize: "14px",
                      fontWeight: 500,
                      letterSpacing: "0.1px",
                      padding: "8px",
                      borderRadius: "var(--a17-shape-sm)",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    Change key
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {showLocal && showGoogle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                margin: "20px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "var(--md-sys-color-outline-variant)" }} />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "0.5px",
                  color: "var(--md-sys-color-on-surface-variant)",
                }}
              >
                or
              </span>
              <div style={{ flex: 1, height: "1px", background: "var(--md-sys-color-outline-variant)" }} />
            </div>
          )}

          {/* Google sign-in */}
          {showGoogle && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {!showLocal && (
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: "var(--md-sys-color-on-surface-variant)",
                    marginBottom: "8px",
                  }}
                >
                  Sign In
                  {googleAuthDomain && (
                    <span style={{ textTransform: "none", fontWeight: 400, marginLeft: "4px" }}>
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
