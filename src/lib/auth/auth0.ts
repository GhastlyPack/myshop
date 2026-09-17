import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { auth0Configured } from "@/lib/env";

// Only instantiated when Auth0 env is present; otherwise lib/auth falls back to dev auth.
export const auth0 = auth0Configured
  ? new Auth0Client({
      authorizationParameters: { scope: "openid profile email" },
    })
  : null;
