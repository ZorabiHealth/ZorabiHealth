# Core Concepts

These are the ideas you need to understand to use ZorabiHealth confidently.

## Profile

A profile stores the user’s identity and role. It is the source of truth for what the user can see and do.

## Role

A role defines access. Common roles are patient, doctor, and pharmacy user.

## Dashboard

A dashboard is the role-specific home screen. It shows the actions and data that matter to that user.

## Medication Reminder

A medication reminder is a scheduled prompt tied to a patient. It can trigger alerts, logs, and follow-up flows.

## Voice Log

A voice log is a spoken note converted into text and stored as structured data.

## Prescription

A prescription is a clinical record created by a doctor. It can be exported, stored, and shared.

## Notification Device

A notification device is a browser or mobile endpoint that receives push alerts.

## Pairing

Pairing links one account to another. It is used when a web account needs to notify a companion mobile device or related user.

## Edge Function

An Edge Function is a server-side task that runs close to the database. ZorabiHealth uses it for scheduled jobs and notification dispatch.

> **Tip:** If a feature behaves strangely, first check whether the user’s role, profile, or pairing is correct.
