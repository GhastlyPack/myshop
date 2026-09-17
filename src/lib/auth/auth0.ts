import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { auth0Configured, env } from "@/lib/env";

// Only instantiated when Auth0 env is present; otherwise lib/auth falls back to dev auth.
// Config is passed explicitly (not read from process.env by the SDK) so the
// `auth_AUTH0_*` names from the Auth0 Vercel integration and the VERCEL_URL-derived
// APP_BASE_URL both work.
export const auth0 = auth0Configured
  ? new Auth0Client({
      domain: env.AUTH0_DOMAIN,
      clientId: env.AUTH0_CLIENT_ID,
      clientSecret: env.AUTH0_CLIENT_SECRET,
      secret: env.AUTH0_SECRET,
      appBaseUrl: env.APP_BASE_URL,
      authorizationParameters: { scope: "openid profile email" },
    })
  : null;
