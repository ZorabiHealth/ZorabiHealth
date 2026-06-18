# Troubleshooting & FAQ

This page covers the most common issues and the fastest fixes.

## Common Problems

### 1. Login works, but the dashboard is empty

- **Problem:** The user signs in but sees no data.
- **Cause:** The profile record or role mapping is missing.
- **Solution:** Verify the profile row exists and matches the authenticated user ID.

### 2. A hardcoded name still appears

- **Problem:** The greeting shows the wrong person.
- **Cause:** The UI is not reading the live profile value yet.
- **Solution:** Fetch the profile after session load and use that value as the source of truth.

### 3. Medication reminders appear in the wrong dashboard

- **Problem:** Doctors or pharmacy users can see patient-only reminders.
- **Cause:** The query or layout is not role-filtered.
- **Solution:** Restrict reminder components to the patient layout and verify role checks.

### 4. Deepgram token request fails

- **Problem:** `/api/deepgram/token` returns an error.
- **Cause:** Missing auth or missing API key.
- **Solution:** Confirm the Deepgram key is set and the request includes the current session token.

### 5. Voice WebSocket fails to connect

- **Problem:** The voice page says the key is invalid.
- **Cause:** The browser is using the wrong token format or the token expired.
- **Solution:** Use the access token returned by the token endpoint and refresh it when needed.

### 6. Prescription PDF generation fails

- **Problem:** PDF export does not complete.
- **Cause:** A missing library fallback or invalid data shape.
- **Solution:** Verify the PDF helper import and confirm the prescription fields are populated.

### 7. Messages are sent twice

- **Problem:** One click produces duplicate chat messages.
- **Cause:** The optimistic temp row and the inserted row are both rendered.
- **Solution:** Replace the temporary row with the inserted database row.

### 8. Appointment booking says profile not found

- **Problem:** The patient is told to finish the profile even when it exists.
- **Cause:** The lookup uses the wrong profile key.
- **Solution:** Query the profile table with the authenticated user’s actual ID field.

### 9. Notification deliveries fail repeatedly

- **Problem:** Alerts are not delivered to a device.
- **Cause:** The push endpoint may be expired or invalid.
- **Solution:** Mark the device inactive after 404/410 responses and replace the token.

### 10. The app feels slow

- **Problem:** Pages take too long to load.
- **Cause:** Too many client fetches or repeated token requests.
- **Solution:** Reduce duplicate requests, cache safely, and keep page-level data fetching focused.

## FAQ

### Why is the dashboard name wrong?

Because the UI is still using a fallback value instead of the live profile.

### Can doctors see patient reminders?

They should not. Patient-only reminders must be rendered inside patient-only layout logic.

### Why do I need Supabase migrations?

They create the tables, policies, and functions the app expects.

### What should I check first for voice issues?

Check the Deepgram API key, auth token flow, and browser permissions.

### What is the fastest way to verify setup?

Sign in, load the dashboard, and confirm profile, reminders, and voice token access all work.
