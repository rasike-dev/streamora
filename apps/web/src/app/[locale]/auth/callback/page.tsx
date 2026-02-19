"use client";

import {useEffect, useState} from "react";

export default function CallbackPage() {
  const [msg, setMsg] = useState("Completing login...");

  useEffect(() => {
    const run = async () => {
      const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER!;
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

      // Extract locale from pathname
      const locale = window.location.pathname.split("/")[1] || "en";

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      const expectedState = sessionStorage.getItem("kc_state");
      if (!code || !state || state !== expectedState) {
        setMsg("Login failed: invalid state.");
        return;
      }

      const tokenUrl = `${issuer}/protocol/openid-connect/token`;

      const body = new URLSearchParams();
      body.set("grant_type", "authorization_code");
      body.set("client_id", clientId);
      body.set("code", code);
      body.set("redirect_uri", `${appUrl}/${locale}/auth/callback`);

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body,
      });

      if (!res.ok) {
        const errorText = await res.text();
        setMsg(`Login failed: token exchange error. Status: ${res.status}`);
        console.error("Token exchange error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
        });
        return;
      }

      const data = await res.json();
      if (!data.access_token) {
        setMsg("Login failed: no access token in response.");
        console.error("Token response:", data);
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token || "");
      console.log("Token stored successfully");

      setMsg("Login complete. Redirecting...");
      window.location.href = `/${locale}/dashboard`;
    };

    run();
  }, []);

  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-2">Auth Callback</h1>
      <p className="text-sm text-muted-foreground">{msg}</p>
    </main>
  );
}
