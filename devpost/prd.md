---
doc: prd
status: approved
---

# AI Real Estate Follow Up Co-Pilot — Product Requirements

A local web app for real estate agents and property marketing teams that turns an audio conversation into an editable lead, scheduled follow-up, and personalized WhatsApp message.
Source: `scope.md > The Unique Kernel`, `Who It's For`, and `The Core Loop`.

## The Core Journey

1. The agent opens the dashboard. With no saved leads, they see the app title and an upload button. With saved leads, the current active lead is prominent and the agent can switch to a recent lead or start another upload. (`scope.md > The Core Loop`)
2. The agent uploads one `.mp3`, `.wav`, `.m4a`, or `.ogg` call recording or voice note. (`scope.md > The POC Boundary`)
3. While processing, the app shows an animated waveform or spinner and step-by-step status text, including “Transcribing audio...” and “Extracting lead insights...”. Processing time is best effort and depends on AI response speed. (`scope.md > What "Working" Looks Like`)
4. On success, the dashboard shows a collapsible transcript, an editable lead card, the follow-up schedule, and a personalized WhatsApp draft. (`scope.md > The Unique Kernel`)
5. The agent can edit extracted details, switch among recent leads, or open WhatsApp with the message prefilled. WhatsApp itself remains the agent's final review-and-send step. (`scope.md > The Core Loop`, `Explicitly Cut`)
6. When a lead's follow-up becomes due while the local app is open, the agent receives a notification with a default ringtone. (`scope.md > The POC Boundary`)

## Screens and Layout

The product is a single-page dashboard headed **“AI Real Estate Follow Up Co-Pilot”**. Its primary action is **“Upload Call Recording / Voice Note”**.

Before any lead is created, the dashboard presents the header and upload action. During processing, the upload/dashboard area presents the animated progress state. After processing, the current active lead is front and center, with a recent-leads area that lets the agent switch to another saved card. The active lead view contains:

- A collapsible full-transcript box.
- A structured, editable lead card.
- A follow-up schedule card.
- A WhatsApp draft and **“Send via WhatsApp”** action.

## Look and Feel

Use a clean, modern dark mode: dark slate or deep navy surfaces with crisp, easy-to-read white text. Use solid emerald green for primary buttons and the WhatsApp action. Use warm amber or bright red status tags, such as **“Hot Lead”**.

## Features and Behavior

### Audio upload and processing

- The agent can choose one `.mp3`, `.wav`, `.m4a`, or `.ogg` audio file.
- Once accepted, the app transcribes the recording and extracts the lead information, follow-up schedule, and WhatsApp message.
- During processing, show an animated waveform or spinner and sequential status messages, including transcription and lead-insight extraction.
- The result-time goal is best effort, not a hard two-second requirement. Keep showing progress until processing completes.
- If the file is invalid or processing fails, show a clear red error alert and a **“Try Again”** action.

### Active lead and recent leads

- Show the active lead prominently, with client name, phone number, property type, budget, location, and lead status.
- Show unavailable extracted details as **“Unknown”**. Each lead-card field is editable by the agent.
- Save recent lead records in browser `localStorage` so they remain available after a page reload. Allow the agent to switch between the recent cards; the current active lead stays prominent.
- Let the agent delete the active lead and its transcript after an explicit confirmation. If other leads remain, select the most recent one; if none remain, return to the empty dashboard.
- The full transcript is available in a collapsible box for review.

### Follow-up schedule and reminders

- Use an explicit date and time from the conversation when one is clear.
- When the conversation does not specify a follow-up time, use the status-based default:
  - Hot: 4 hours after processing.
  - Warm: 24 hours after processing.
  - Cold: 3 days after processing.
  - Unknown status: 24 hours after processing.
- Let the agent edit the lead status and scheduled date/time.
- If the agent changes the status, recalculate the suggested follow-up time unless they have manually edited the scheduled date/time. A manually chosen time is preserved if the status changes later.
- Let the agent enable browser notifications from the reminder card. When a follow-up becomes due while the local app is open, show a one-time browser notification and play a short chime; keep an in-app reminder visible when browser notifications or sound are unavailable.

### WhatsApp follow-up

- Generate a personalized WhatsApp draft using the conversation and extracted buyer needs. The draft must be suitable to send when the follow-up is due and must not mention a date, day, time, appointment, or when the agent will follow up.
- The agent can edit the phone number and message.
- Disable **“Send via WhatsApp”** when the phone number is missing or invalid. Enable it when a valid number is provided.
- When the reminder becomes due, the agent can open WhatsApp with the recipient and draft prefilled, review it, and send it manually. The app does not send messages automatically.

## States and Boundaries

- **First use / no saved leads** — Show the app header and upload action.
- **Processing** — Show an animated loading indicator and step-by-step status text until success or failure.
- **Successful extraction** — Show the transcript and lead, schedule, and message content. Unknown details are labeled **“Unknown”** and remain editable.
- **Invalid file or processing failure** — Show a red error alert with **“Try Again”**.
- **Missing or invalid phone number** — Keep the WhatsApp action disabled until the agent enters a valid number.
- **Due reminder** — Show a one-time browser notification and short chime, with an in-app reminder fallback, only while the local app is open.
- **Reload** — Restore saved recent lead records from browser `localStorage`.

## Product Decisions

- The input is an uploaded audio recording or voice note, not a pasted text note; supported formats are `.mp3`, `.wav`, `.m4a`, and `.ogg`.
- The core result combines transcription, lead extraction, a follow-up schedule, and a tailored WhatsApp message from one conversation.
- The main dashboard keeps the current lead front and center while allowing switching among recent leads saved in `localStorage`; this provides reload persistence without a backend database.
- The default follow-up schedule is status-based: hot in 4 hours, warm in 24 hours, cold in 3 days, and unknown status in 24 hours.
- A manually edited follow-up time is preserved when the lead status subsequently changes.
- Reminders work only while the local app is open; persistent push after closing it is out of scope for the demo.
- The WhatsApp draft is personalized, editable, ready to send when the follow-up is due, and contains no date/time reference. At reminder time, WhatsApp opens with the message prefilled for agent review and manual sending. A missing or invalid phone number disables this action.
- The two-second processing target is best effort, dependent on AI speed; progress updates remain visible while processing.

## What We're Building

- A single-page local dashboard with audio upload, progress, transcript, editable lead details, status-based follow-up scheduling, due reminders with sound while open, recent leads with reload persistence, and a WhatsApp handoff.
- The short demo should show a recording becoming a lead card, follow-up schedule, and personalized WhatsApp draft, then demonstrate the agent opening the prefilled WhatsApp message.

## Deferred From the POC

- Persistent push notifications while the app is closed; this requires backend and web-push setup that is outside the local demo boundary.
- A full CRM, multi-agent workflow, or server-backed lead database.
- Automatic WhatsApp sending; the agent must review and send the message.

## Possible Later Enhancements

The app could later support persistent reminders and a fuller CRM or team workflow.

## Non-Goals

- The app will not send WhatsApp messages without the agent's review and action.
- The app will not deliver reminders when it is closed.
- The app will not provide a full CRM or multi-user collaboration in this proof of concept.

## Open Questions

- None identified for the product definition. Technical choices and any integration constraints belong in `4-spec`.
