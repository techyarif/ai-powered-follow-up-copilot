---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Analyze and edit an AI-generated lead**
  Becomes usable: A locally running dashboard accepts a supported audio clip and displays the transcript, editable lead details and status, editable follow-up time, and editable WhatsApp draft returned by Gemini.
  Why now: Bootstrapping belongs inside the first usable slice. This proves the unique kernel and checks the Gemini audio/JSON integration early; early hands-on feedback also moved editing into this first usable result, before investing in persistence and reminder behavior.
  PRD ref: `prd.md > The Core Journey`, `Features and Behavior > Audio upload and processing`, `Features and Behavior > Active lead and recent leads`, `Features and Behavior > Follow-up schedule and reminders`, `Features and Behavior > WhatsApp follow-up`, `Screens and Layout`, `Look and Feel`, `States and Boundaries`.
  Spec ref: `spec.md > How This Works, In Plain Language`, `The Core Journey Through the System`, `Stack`, `Where It Runs and How Someone Tries It`, `Look and Feel`, `Components > Dashboard page`, `Components > Audio upload and processing panel`, `Components > Editable lead card`, `Components > WhatsApp draft panel`, `Components > POST /api/analyze route`, `External Services and Dependencies > Local API route: POST /api/analyze`, `External Services and Dependencies > Google Gemini API`, `Important Failure Modes`, `File Structure`.
-  Build: Scaffold Next.js App Router with React, TypeScript, and Tailwind in `web/` so the course files at the repository root remain untouched. Add the dark dashboard shell, supported audio picker with 12 MB client/server validation, indicative progress labels, retry error state, and `POST /api/analyze`. In the route, send inline audio in one `@google/genai` Interactions API call to `gemini-3.8-flash`, validate structured output, and return transcript, lead fields, proposed follow-up time, and a personalized WhatsApp draft without date/time wording. Render the successful extraction with editable lead fields, status, schedule, and message; status changes recalculate the schedule until the agent manually changes it. Add `.env.example`, ensure `.env.local` and credentials are ignored, and document local setup in the root README.
  Verify (mechanical): From `web/`, run `npm run lint`, `npx tsc --noEmit`, and `npm run build`; from the repository root run `git diff --check`. Start the app and make one real upload with the local Gemini key to verify the API success path and one invalid/oversized file to verify rejection. Verify editing, future-time validation, status-based schedule updates, message editing, and that the generated message does not mention its scheduled date/time.
  Learner check: Open the local dashboard, upload a short supported recording (12 MB or less), check the transcript and extracted result, edit a lead detail, change status and schedule, and confirm the WhatsApp message can be edited and does not mention a date/time.
  Commit: `Make AI-generated lead details editable`

- [x] **2. Save and return to recent leads**
  Becomes usable: Agents can switch between recent leads and find their corrected lead details, status, schedule, and WhatsApp draft after reloading the page.
  Why now: Once an extracted lead can be corrected in the active card, persistence and retrieval let the agent return to that work without introducing a backend database.
  PRD ref: `prd.md > Features and Behavior > Active lead and recent leads`, `Features and Behavior > Follow-up schedule and reminders`, `Features and Behavior > WhatsApp follow-up`, `States and Boundaries`.
  Spec ref: `spec.md > Components > Editable lead card`, `Components > WhatsApp draft panel`, `Components > Lead storage helper`, `Data Model`, `External Services and Dependencies > WhatsApp`, `Important Failure Modes`.
  Build: Add typed lead records and safe `localStorage` helpers; persist the current editable lead and implement recent-lead selection. Preserve the active lead and its transcript, edits, and schedule across reloads.
  Verify (mechanical): From `web/`, run `npm run build` and `npx tsc --noEmit`; from the repository root run `git diff --check`. Verify saved JSON round-trips and that an edited lead remains available after reload and switching between recent leads.
  Learner check: Edit an extracted lead and schedule, reload the page, switch between recent leads, and verify that each card restores its own edits.
  Commit: `Persist editable leads and WhatsApp follow-ups`

- [x] **3. Get an in-app reminder when a follow-up is due**
  Becomes usable: The open dashboard checks saved future follow-ups and gives a one-time browser notification and audible chime at the due time, with an in-page fallback.
  Why now: Reminders depend on persisted lead schedules, so they follow the lead lifecycle slice. The app stays browser-only instead of introducing a background server or push service.
  PRD ref: `prd.md > Features and Behavior > Follow-up schedule and reminders`, `States and Boundaries`, `Core Journey`.
  Spec ref: `spec.md > Components > Follow-up schedule and reminder controller`, `Components > Lead storage helper`, `Data Model`, `Important Failure Modes`, `What Was Simplified and Why`.
  Build: Request notification permission from a user action; initialize a short Web Audio chime after interaction; check due leads on load and periodically while open; record a one-time notification marker so alerts do not repeat after reload; clear the marker when the schedule is edited. Show an in-page alert if notification permission or sound is unavailable.
  Verify (mechanical): From `web/`, run `npm run build` and `npx tsc --noEmit`; from the repository root run `git diff --check`. With browser notification permission granted, schedule a due test reminder and confirm it fires once; reload afterward and confirm the notification marker prevents a duplicate.
  Learner check: Grant notification permission, set a reminder a short time ahead, leave the dashboard open, and confirm the browser notification, chime, and in-page behavior. Also try the denied-permission fallback if convenient.
  Commit: `Add browser follow-up reminders`

## Hands-on Checkpoints

- [x] Early usable behavior explored — tried a real recording, edited the lead and schedule, reviewed the WhatsApp draft, and confirmed the current flow is working well. Learner asked whether due-time notifications are included; clarified that reminders are planned for Slice 3 and are not implemented yet.
- [x] Final kick-the-tires exploration and feedback completed — learner verified a due reminder notification and heard the chime; earlier hands-on checks covered editing, schedule behavior, persistence, and switching recent leads. A later “Failed to load page” was traced to the stopped local dev server, which was restarted and returned HTTP 200.

## Final Review

- [x] Final review complete — learner confirmed the proof of concept is ready to ship after reminder behavior worked; the temporary local-server outage was resolved.

## Code Tour and App Map

- [x] Learning activity complete — focused review of the real build-time Gemini model compatibility pivot and the successful live audio-to-structured-response verification; no learner code navigation was claimed.
- [x] Optional edit and transfer reflection addressed — no extra code edit was needed; learner's optional transfer reflection is saved in the ignored learner profile.
- [x] `devpost/app-map.html` generated from finished code, checked offline in the browser, and shown, including a project-grounded practice to reuse.

Activity and evidence: Focused review grounded in the observed `gemini-2.5-flash` 404, learner-approved move to Gemini 3.8 Flash Interactions, successful real audio request, and browser checks of the editable lead and due reminder.
Route and stops: Reference route prepared in `devpost/app-map.html`; it connects `POST` in `web/app/api/analyze/route.ts`, `parseAnalysisResult` in `web/lib/lead-schema.ts`, and the lead/reminder flow in `web/app/page.tsx`. Learner was not asked to navigate the code.
Edit outcome: No extra learning-wrap-up code edit proposed; the learner's requested behavior was already implemented and verified.
Reflection: Transfer question offered and answered; the personal response is recorded privately in the ignored learner profile.
Activity mode: Focused evidence-based review from the build.

## Revisions

- The Next.js app lives in `web/` because the repository root contains course files; the upload limit is 12 MB rather than 20 MB so inline base64 audio can stay within request limits without the Google Files API. A real test with the configured Gemini key showed `gemini-2.5-flash` unavailable to new users; with learner agreement, Slice 1 uses `gemini-3.8-flash` and the Interactions API.
- After early hands-on feedback, moved editable lead fields, status/schedule controls, and WhatsApp draft from Slice 2 to Slice 1. Slice 2 now focuses on persistence and recent-lead switching. The WhatsApp draft must be suitable to send when due without date/time wording; sending remains manual.
- Final browser review confirmed the real notification and chime. “Failed to load page” was caused by the stopped local development server rather than an app response failure; restarting `npm run dev` restored the page and returned HTTP 200.
- After the learner asked how to remove saved leads, added a confirmation-protected active-lead delete action. It removes the lead and transcript from `localStorage`, selects the newest remaining lead, and returns to the empty state when no leads remain.
