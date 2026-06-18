# API / Integrations

ZorabiHealth integrates with Supabase, Deepgram, and push notification services.

## Supabase Auth

### Purpose

Handles sign-in, sessions, and role-aware access.

### Common flow

```text
Client -> Supabase Auth -> Session -> Role-aware dashboard
```

### Constraints

- Auth redirects must match the deployed app URL
- Sensitive calls should use server-side keys only

## Deepgram Voice Token

### Endpoint

`GET /api/deepgram/token`

### Purpose

Returns a short-lived access token for voice features.

### Example Response

```json
{
  "key": "dg_...",
  "expiresIn": 3600
}
```

### Authentication

Requires the user to be authenticated.

## Notification Dispatch

### Edge Function

`dispatch-notifications`

### Purpose

Sends reminders and alerts to web and mobile devices.

### Inputs

- Pending notification records
- Device records
- Pairing records

### Constraints

- Expired endpoints should be deactivated
- Retry logic should stop after repeated failures

## Push Notifications

### Purpose

Delivers reminder alerts to browsers and mobile devices.

### Notes

- Web push uses VAPID keys
- Mobile push uses Expo push tokens where enabled

> **Tip:** If a connected device stops receiving alerts, check whether it was marked inactive after a 404 or 410 response.
