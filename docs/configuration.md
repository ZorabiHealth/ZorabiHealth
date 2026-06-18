# Configuration & Settings

This page lists the most important settings used by the platform.

| Name                                   | Type   | Default                 | Description                                             |
| -------------------------------------- | ------ | ----------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | string | none                    | Supabase project URL used by the browser client.        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | string | none                    | Public Supabase key for authenticated client access.    |
| `SUPABASE_SERVICE_ROLE_KEY`            | string | none                    | Server-only key for Edge Functions and admin workflows. |
| `SUPABASE_JWT_SECRET`                  | string | none                    | Used to validate JWT-based auth flows where applicable. |
| `NEXT_PUBLIC_APP_URL`                  | string | `http://localhost:3000` | Base URL used in redirects and local development.       |
| `DEEPGRAM_API_KEY`                     | string | none                    | Used by the voice assistant token flow.                 |
| `GEMINI_API_KEY`                       | string | none                    | Used for AI-assisted content generation where enabled.  |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | string | none                    | Public key for browser push notifications.              |
| `VAPID_PRIVATE_KEY`                    | string | none                    | Private key for web push signing.                       |
| `NEXT_PUBLIC_FIREBASE_API_KEY`         | string | none                    | Used if Firebase-based features are enabled in the app. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`      | string | none                    | Firebase project identifier.                            |

## Recommended Setup

- Keep secrets in `.env.local`
- Use one Supabase project per environment
- Match the deployed app URL in auth redirects
- Keep public and private push keys paired correctly

> **Note:** If a feature is missing data, check the environment value first, then the database schema, then the UI.
