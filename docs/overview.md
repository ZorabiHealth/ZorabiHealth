# Overview

ZorabiHealth is a healthcare coordination platform built for patients, doctors, and pharmacy teams. It brings together health logging, voice input, medication reminders, prescriptions, messaging, and operational workflows in one place.

## Who It’s For

- Patients who want a single place to manage reminders and health data
- Doctors who need fast clinical workflows and prescription tools
- Pharmacy teams that manage fulfillment, inventory, and order status
- Admins who need visibility into activity, routing, and scheduled jobs

## Key Benefits

- Centralizes care workflows in one app
- Reduces manual reminder and logging work
- Makes clinical updates easier to track and review
- Supports real-time updates through Supabase
- Adds voice-driven input for faster data entry

## How It Works

The platform has three layers: experience, services, and data. That keeps the system easier to understand and easier to maintain.

1. **Experience**: patients, doctors, and pharmacies use the Next.js app.
2. **Services**: auth, voice, AI, and background jobs process actions.
3. **Data**: Supabase stores records, files, and realtime updates.

> **Tip:** Think of ZorabiHealth as a shared operating system for care coordination.

## Main Modules

- Patient dashboard and reminders
- Doctor dashboard and prescriptions
- Pharmacy workflows and fulfillment
- Voice logging and AI-assisted actions
- Notifications and device sync
