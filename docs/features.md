# Features & How-To Guides

This section explains the major product areas and how to use them.

## 1. Patient Dashboard

### What it does

Shows the patient’s name, summary cards, reminders, medication status, and recent activity.

### When to use it

Use it as the first screen after login.

### How to use it

1. Sign in as a patient.
2. Open the dashboard.
3. Review the greeting and summary cards.
4. Check reminders and any due actions.

### UI Elements

- Greeting banner
- Health summary cards
- Medication reminders
- Recent activity feed

> **Tip:** The dashboard should always reflect the current profile, not a hardcoded name.

## 2. Voice Assistant

### What it does

Lets users speak health updates, reminders, and quick notes.

### When to use it

Use it when typing is slower than speaking.

### How to use it

1. Open the voice page.
2. Allow microphone access.
3. Start speaking clearly.
4. Review the parsed result before saving.

### UI Elements

- Microphone button
- Live transcript area
- Action preview
- Save or cancel controls

## 3. Medication Reminders

### What it does

Schedules alerts for medicines and logs adherence.

### When to use it

Use it for daily medicines, short courses, and refills.

### How to use it

1. Open the medication section.
2. Add the medicine name and schedule.
3. Save the reminder.
4. Confirm it appears only for the correct patient.

### Best Practices

- Keep the reminder linked to one patient profile
- Use exact times for scheduled doses
- Review missed-dose history regularly

## 4. Messages

### What it does

Supports direct communication between authorized users.

### When to use it

Use it for follow-up questions and care coordination.

### How to use it

1. Open the messages page.
2. Choose the correct conversation.
3. Type and send one message.
4. Confirm the message is not duplicated.

## 5. Prescriptions

### What it does

Creates and exports prescription records as PDFs.

### When to use it

Use it after a clinical decision or medication update.

### How to use it

1. Open the doctor prescription screen.
2. Enter the medication details.
3. Preview the prescription.
4. Export or save the PDF.

### UI Elements

- Prescription form
- Preview panel
- Export button
- Archive list

## 6. Appointments

### What it does

Lets patients book visits and lets doctors manage availability.

### When to use it

Use it when a patient needs a scheduled consultation.

### How to use it

1. Confirm the patient profile is complete.
2. Open booking.
3. Select an available slot.
4. Submit the request.

> **Warning:** If booking says the profile is missing, verify the patient profile record matches the authenticated user.
