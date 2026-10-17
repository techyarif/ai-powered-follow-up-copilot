---
doc: spec
status: approved
---

# AI Real Estate Follow Up Co-Pilot — Technical Spec

## How This Works, In Plain Language

The dashboard is a Next.js web app built with React and TypeScript, styled with Tailwind CSS. When the agent picks an audio recording, the browser sends it to a small Next.js API route on the local app. That route passes the audio directly to Google's Gemini 3.8 Flash using the official `@google/genai` library and the Interactions API. Gemini returns the transcript and lead details together as structured JSON. The route sends that result back to the browser and does not save the audio.

The browser keeps the current lead and recent leads in `localStorage`—like a small sticky note kept by this browser for this site. Editing a lead updates that saved copy. While the app is open, the browser checks upcoming reminders and can show a notification and play a short ringtone after the user grants notification permission and interacts with the page. WhatsApp is opened with the number and draft filled in; the agent still reviews and sends it.

This keeps the proof of concept to one local app and one external service (Gemini), with no login, hosted database, audio file storage, or deployed server.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. The browser loads the Next.js dashboard. It reads recent lead cards and the selected lead from `localStorage`; if none exist, it shows the empty dashboard.
2. The agent selects one `.mp3`, `.wav`, `.m4a`, or `.ogg` file. The browser checks its extension/MIME type and 12 MB maximum before sending it.
3. The page shows indicative loading stages such as “Transcribing audio...” and “Extracting lead insights...” while the browser sends the file as `multipart/form-data` to `POST /api/analyze`.
4. The API route validates the file again, reads it into memory, and sends inline audio data plus an extraction prompt, the browser's current time/time zone, and a JSON schema to Gemini 3.8 Flash through one Interactions API call. It asks Gemini for a verbatim transcript and lead fields, including a clearly stated follow-up date/time if present, or an empty string if absent. It returns validated JSON to the browser and discards the in-memory upload after the request.
5. The browser calculates the reminder: use an explicit date/time if valid and in the future; if it is in the past or invalid, use the status-based fallback. Interpret dates and times in the device's local time zone. Store the resulting card, transcript, and reminder notification marker in `localStorage`, select it as active, and render it in the dashboard.
6. The agent reviews and edits the lead fields, status, reminder time, phone number, or WhatsApp draft. A status change recalculates the reminder from the current time only if the reminder has not been manually edited. Each edit updates `localStorage`.
7. On page load and periodically while the page remains open, a browser timer checks all saved leads for due reminders. It uses the browser Notification API if permission is granted, plays a short generated chime after an allowed user interaction, and shows an in-page reminder as fallback if notification/audio is unavailable. Browser timer throttling can delay alerts in inactive tabs.
8. When the reminder is due, if the phone number is valid, the agent can open `https://wa.me/<number>?text=<encoded-message>` in a new tab. The prepared message avoids mentioning any date or time; the agent reviews and sends it manually.

## Stack

- **Next.js App Router, React, and TypeScript** — the learner's chosen framework and language for the local dashboard and API route. The API route keeps the Gemini key on the server side.
  - [Next.js App Router documentation](https://nextjs.org/docs/app)
  - [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- **Tailwind CSS** — the learner's chosen styling approach; use it for the dark slate/navy dashboard and emerald/amber/red accents.
  - [Tailwind CSS documentation](https://tailwindcss.com/docs)
- **`@google/genai`** — Google's official, recommended JavaScript/TypeScript SDK, used only in the server-side route.
  - [Google GenAI SDK libraries](https://ai.google.dev/gemini-api/docs/libraries)
  - [Google GenAI JavaScript SDK on npm](https://www.npmjs.com/package/@google/genai)
- **Gemini 3.8 Flash (`gemini-3.8-flash`)** — learner-approved model after a live test showed the configured key could not access Gemini 2.5 Flash. Use the current Interactions API for audio understanding and structured JSON output.
  - [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models)
  - [Gemini 3.8 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
  - [Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview)
  - [Audio understanding](https://ai.google.dev/gemini-api/docs/audio)
  - [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- **Browser APIs** — `localStorage` for recent lead persistence; Notification API for permission-based browser alerts; Web Audio for a short generated chime.
  - [MDN: `localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
  - [MDN: Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
  - [MDN: `Notification.requestPermission()`](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static)
  - [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

Pin compatible package versions during scaffolding; exact versions are to be selected and checked in the build rather than guessed here.

## Where It Runs and How Someone Tries It

- Run locally in a modern desktop browser using the Next.js development server. No deployment is planned for the proof of concept.
- Requires Node.js compatible with the selected Next.js version and a Gemini API key. Create `.env.local` with `GEMINI_API_KEY=...`; keep `.env.local` ignored by Git. Never expose the key through a `NEXT_PUBLIC_` variable or send it to the browser.
- The repository also contains the course's planning and skill files, so keep the generated Next.js application in a separate `web/` directory. From the repository root, scaffold into `web/`; then run `npm install` and `npm run dev` from `web/` and open `http://localhost:3000`.
- Notification permission and audio playback may require a user click. Request notification permission from a clear dashboard action and initialize/test the reminder chime during that interaction.
- For the required short demo video, upload a prepared short audio clip of 12 MB or less, show the loading stages and extracted result, edit a field, demonstrate a due reminder (use a short test reminder interval), and open a valid-number WhatsApp draft. Keep a public GitHub repository free of `.env.local`, real API keys, and private client recordings. Deployment is optional and does not replace the demo video or public repository.

## Look and Feel

Implement the PRD's clean, modern dark mode: deep navy or dark slate surfaces, crisp white text, emerald primary and WhatsApp actions, and warm amber or bright red lead-status badges. Keep the main active lead visually prominent and the transcript collapsible. Use readable typography, clear form labels, visible focus states, and enough contrast for status colors; don't rely on color alone to communicate a status.

PRD ref: `prd.md > Look and Feel`, `Screens and Layout`.

## Components

### Dashboard page

Owns the single-page layout, upload entry point, first-use state, current active lead, recent-lead switching, and confirmed deletion of the active saved lead.

Implements `prd.md > Screens and Layout`, `Active lead and recent leads`.

### Audio upload and processing panel

Accepts one audio file, validates its size/type before upload, posts it to `/api/analyze`, and displays indicative progress stages. The stages are not separate Gemini progress events: the single request returns transcript and lead details together. On errors, show the red alert and Try Again action.

Implements `prd.md > Audio upload and processing`, `States and Boundaries`.

### Transcript panel

Displays the returned full transcript in a collapsible review area.

Implements `prd.md > Screens and Layout`, `Active lead and recent leads`.

### Editable lead card

Displays and edits client name, phone, property type, budget, location, status, scheduled local date/time, and WhatsApp draft. Missing values display as `Unknown`. Status edits update the suggested follow-up time unless the agent has manually edited it. Lead-card edits are in memory in Slice 1 and persist to `localStorage` in Slice 2.

Implements `prd.md > Active lead and recent leads`, `Follow-up schedule and reminders`.

### Follow-up schedule and reminder controller

Displays and edits the scheduled local date/time; calculates defaults and prevents past reminders. An explicit user action requests browser notification permission and resumes the audio context. While the app is open, a 15-second browser timer checks all saved leads and triggers one notification and a short chime for each due lead. An in-page due alert remains visible if notifications or sound are unavailable. A persisted notification marker prevents repeated system notifications after reload; editing a schedule clears the marker so its new due time can notify.

Implements `prd.md > Follow-up schedule and reminders`, `States and Boundaries`.

### WhatsApp draft panel

Displays and edits the generated draft, which is ready to send at the scheduled follow-up and must not mention any date, day, time, or appointment. Validates the phone number and lets the agent open WhatsApp with an encoded recipient and message when they choose. The agent manually reviews and sends; never send automatically.

Implements `prd.md > WhatsApp follow-up`.

### `POST /api/analyze` route

Accepts one multipart audio file, validates extension/MIME and a 12 MB maximum, reads it transiently, calls Gemini, validates the returned JSON, then responds with the transcript and extracted lead data. It never writes audio to disk or calls Google's persistent Files API.

Implements `prd.md > Audio upload and processing`.

### Lead storage helper

Loads, saves, and updates recent lead cards and the active card in browser `localStorage`; guards browser-only access so it runs only on the client. Deleting a confirmed active lead removes its record and transcript, then selects the newest remaining record or clears the active ID.

Implements `prd.md > Active lead and recent leads`, `States and Boundaries`.

## Data Model

The browser owns a `LeadRecord` for each analyzed recording:

```ts
type LeadStatus = "hot" | "warm" | "cold" | "unknown";

type LeadRecord = {
  id: string;
  createdAt: string; // ISO timestamp
  transcript: string;
  clientName: string;
  phoneNumber: string;
  propertyType: string;
  budget: string;
  location: string;
  status: LeadStatus;
  followUpDateTime: string; // Explicit conversation time or manual choice; empty for the status-based default
  followUpAt: string; // ISO timestamp representing a local-time selection
  followUpManuallyEdited: boolean;
  reminderNotifiedAt: string | null;
  whatsappMessage: string;
};
```

The browser sends `clientNow` (an ISO timestamp) and `timeZone` (the browser's IANA zone, such as `Asia/Kolkata`) with the audio. Gemini returns the verbatim transcript and extracted lead fields, plus `followUpDateTime` as an ISO-8601 timestamp with offset or `null`. The server validates the JSON shape and status; the client normalizes missing details to `Unknown`, status to one of the allowed values (otherwise `unknown`), and creates the ID and timestamps. If the phone number is absent, store an empty string and show an editable blank phone field with an `Unknown` hint so it can become valid when entered. The client derives `followUpAt` using an explicit future time when valid, otherwise the fallback: hot +4 hours, warm +24 hours, cold +3 days, unknown +24 hours. Gemini resolves spoken dates using the supplied local current time and time zone. If an explicit time is invalid or in the past, use the status fallback rather than storing a past reminder. A later status change recalculates from the time of that status edit, unless the schedule was manually edited. Date/time edits from `datetime-local` are interpreted in the browser's local time zone and converted to an ISO timestamp for storage.

Store the recent `LeadRecord[]` and active lead ID under versioned keys such as `follow-up-copilot:leads:v1` and `follow-up-copilot:active-lead:v1` in `localStorage`. Creating a record, editing any field, changing the schedule, or selecting another active record updates the corresponding key. Validate saved records before rendering them; report malformed data or browser storage failures instead of silently replacing saved leads. On reload, restore these values. No account or cross-browser sync exists; clearing site data removes saved leads.

The original audio is held only in the browser upload and API request memory long enough for analysis. It is not saved to `localStorage`, a database, disk, or Google's Files API. The Gemini API key exists only in `.env.local` and server-side process environment.

## File Structure

```text
repository/
├── web/                            # Standalone Next.js application root
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts        # Validate upload; call Gemini; return structured result
│   │   ├── globals.css             # Tailwind import and global styles
│   │   ├── favicon.ico             # Scaffold browser icon
│   │   ├── layout.tsx              # Root layout and metadata
│   │   └── page.tsx                # Dashboard composition and browser-side lead state
│   ├── lib/
│   │   └── lead-schema.ts          # Shared result types and runtime validation
│   ├── public/                     # Scaffold SVG assets
│   ├── AGENTS.md                   # Next.js-specific coding and documentation guidance
│   ├── .env.example                # Secret-free API key placeholder
│   ├── eslint.config.mjs           # ESLint configuration
│   ├── next.config.ts              # Next.js and Tailwind/Turbopack configuration
│   ├── package.json                # Scripts and dependencies
│   ├── package-lock.json           # Locked npm dependency versions
│   ├── README.md                   # Generated scaffold instructions
│   └── tsconfig.json               # TypeScript configuration
├── .gitignore                      # Ignore .env.local and local credentials
├── README.md                       # Local setup, API key, and demo instructions
└── devpost/                        # Planning artifacts; learner profile stays ignored
```

## External Services and Dependencies

### Local API route: `POST /api/analyze`

- **Request:** `multipart/form-data` with `audio` (one file, max 12 MB), `clientNow` (ISO timestamp), and `timeZone` (IANA time-zone string). Accept only `.mp3`, `.wav`, `.m4a`, and `.ogg` with an allowed MIME type; validate on both client and server.
- **Success response:** JSON with `transcript: string` and `lead: { clientName: string, phoneNumber: string, propertyType: string, budget: string, location: string, status: "hot" | "warm" | "cold" | "unknown", followUpDateTime: string, whatsappMessage: string }`. Use empty `phoneNumber` when absent; other missing values become `Unknown` in the client. `followUpDateTime` must parse as a date-time with offset or be an empty string.
- **Error response:** a non-success HTTP status with a safe JSON `{ error: string }` message; never expose the API key or raw provider error.
- **Implementation:** parse `request.formData()`, validate and read the uploaded `File` in memory, then call Gemini once. Do not write audio to disk, retain it in a Google Files upload, or include it in response/logs. Return only transcript and extracted fields.

### Google Gemini API

- **SDK:** `@google/genai`, official Google JavaScript/TypeScript SDK. Keep imports and calls in server-only code.
- **Model:** `gemini-3.8-flash`.
- **Endpoint/method:** one `POST /v1beta/interactions` call through `ai.interactions.create`.
- **Request:** `model`, a text-and-audio `input` array (audio bytes as base64 inline `data` with `mime_type`), and `response_format: { type: "text", mime_type: "application/json", schema }`. The prompt also includes browser `clientNow` and `timeZone`.
- **Response:** read the SDK's `output_text` convenience property, parse the JSON object, and validate it before returning the app's response. Request transcript, client name, phone number, property type, budget, location, status, explicit follow-up time or an empty string, and a personalized WhatsApp draft suitable to send when due and containing no date, day, time, or appointment reference. Do not request Gemini to invent missing details.
- **Authentication:** `GEMINI_API_KEY` from `.env.local`, read only by the API route.
- **Upload/data retention:** send inline data rather than uploading to Google's Files API; app code retains no source audio after the request. Gemini service processing follows Google's API terms and data handling; do not promise the provider never retains data. Review [Gemini API additional terms](https://ai.google.dev/gemini-api/terms) and [pricing](https://ai.google.dev/gemini-api/pricing) before sharing the public demo.
- **Limits/cost:** reject audio over 12 MB before the Gemini request. Base64 encoding adds roughly one-third to the audio payload size, so this lower app limit leaves room for the prompt and JSON fields in the API request. Confirm current provider request limits, supported audio MIME types, quotas, and pricing during build. This spec does not claim a particular free quota.
- **Documentation:** [SDK](https://ai.google.dev/gemini-api/docs/libraries), [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview), [audio](https://ai.google.dev/gemini-api/docs/audio), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [terms](https://ai.google.dev/gemini-api/terms), [pricing](https://ai.google.dev/gemini-api/pricing).

### WhatsApp

Open a user-initiated `https://wa.me/<international-number>?text=<URL-encoded-message>` link in a new tab. No WhatsApp API credentials or automatic message sending are used. Normalize/validate the number as international digits before enabling the action.

## Important Failure Modes

- **Unsupported, oversized, or malformed audio** → reject on the client and server; show the red error alert and Try Again. Limit is 12 MB.
- **No usable analysis** → if the transcript has no clear speech and all extracted lead details are unknown, return an error so the dashboard prompts the agent to retry instead of saving an empty lead.
- **Gemini key, quota, network, or malformed structured response failure** → API route returns a safe non-secret error response; dashboard shows a retry action and preserves already saved leads. Never return raw provider errors or the key.
- **Notification permission denied or sound blocked** → show an in-page due reminder; retain a visible way to test/request permission and initialize/play the chime after a user interaction.

## What Was Simplified and Why

- **One Gemini request returns transcript and extracted lead JSON together** instead of separate transcription and extraction services — fewer calls and setup; loading stages are indicative UI states, not claims of separate completed work.
- **Recent leads live in browser `localStorage`** instead of a hosted database — single-user persistence across reloads without accounts, migrations, or server setup. They do not sync across browsers/devices.
- **Reminder checks run in the open browser page** instead of a background worker or web-push service — enough for the local demo; reminders cannot fire after the app/browser closes.
- **Audio is transient inline request data** instead of a persistent upload — no audio-file store is needed, subject to the 12 MB limit and current Gemini API inline-audio constraints.

## Decisions and Open Issues

- **Learner choice:** Next.js App Router with React/TypeScript and Tailwind CSS; selected to build the local app with a server API route and the requested UI stack.
- **Learner choice:** official `@google/genai` SDK with `gemini-3.8-flash` and the Interactions API; updated after a real API call confirmed that the configured key could not use `gemini-2.5-flash`.
- **Learner choice:** process audio in memory in one API call; persist only transcript and lead-card data in browser `localStorage`, not the raw audio.
- **Learner choice:** maximum upload size is 12 MB; this keeps inline audio in-memory without using Google's Files API.
- **Learner choice:** one Gemini call with indicative UI loading stages for speed; stage labels are not real-time progress events.
- **Learner choice:** reminders run entirely in-browser while the app is open; use the device's local time zone for dates and reminders; past extracted times fall back to a future status-based time.
- **Learner choice:** browser notifications request permission; in-page reminder fallback and sound behavior cover denied/blocked permissions.
- **Learner choice:** the editable WhatsApp draft is prepared for the reminder time without date/time wording; opening WhatsApp and sending remain agent-controlled manual actions.
- **Learner choice:** `.env.local` is used for the Gemini key and ignored by Git; never put the key in a public variable or committed file.
- **Build revision:** after early hands-on feedback, editing lead fields, status, schedule, and WhatsApp draft moved from Slice 2 into Slice 1. Persistence and switching recent leads remain in Slice 2.
- **Implementation adjustment:** keep the generated Next.js app in `web/` because the repository root already contains course skill and planning material; this avoids scaffolding conflicts and leaves the approved product behavior and stack unchanged.
- **Clarified uncertainty:** the learner wanted sequential transcription and extraction status. A single Gemini request does not report separate live stage completion; this was clarified and the learner chose indicative loading stages while one request runs.
- **Implementation revision:** the first live API request returned 404 because the configured key cannot use `gemini-2.5-flash`; with the learner's agreement, the model and request method were updated to `gemini-3.8-flash` and `ai.interactions.create`. The UI and product behavior are unchanged.
- **Verify early during build:** ensure the selected Gemini model/API supports inline audio for all four accepted formats, the JSON response schema, and the 12 MB app limit; test audio/browser notification and autoplay behavior in the target desktop browser. Model quotas, pricing, request limits, and service data handling can change.
- **No unresolved product choices block build.**

## Sharing

- **Public GitHub repository:** https://github.com/techyarif/ai-powered-follow-up-copilot
- The published snapshot includes the app and all `devpost/` project documents except the private learner profile. `.gitignore` files, `.env.local`, and the bundled skill-pack files/history are not published. `web/.env.example` contains only a placeholder.
