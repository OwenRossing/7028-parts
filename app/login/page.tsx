import { LoginClient } from "./login-client";

export default function LoginPage() {
  const appMode = (process.env.APP_MODE ?? "production") as "demo" | "local" | "production";
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? null;
  const googleAuthDomain = process.env.GOOGLE_AUTH_DOMAIN ?? null;

  return (
    <LoginClient
      appMode={appMode}
      googleClientId={googleClientId}
      googleAuthDomain={googleAuthDomain}
    />
  );
}
