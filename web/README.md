# AI Real Estate Follow Up Co-Pilot

This local app turns a call recording or voice note into a transcript, editable lead, follow-up reminder, and WhatsApp draft.

## Run locally

1. Install Node.js and get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to your key. Keep `.env.local` private.
3. From this directory, run `npm install` and `npm run dev`.
4. Open <http://localhost:3000>.

Upload one MP3, WAV, M4A, or OGG file up to 12 MB. Audio is sent inline for Gemini analysis and is not saved by the app. Transcripts and editable leads are stored in this browser's `localStorage`; recent leads can be switched or deleted. Enable browser reminders from the lead card. Keep the app open for notifications and the chime to work. WhatsApp opens a prefilled draft for you to review and send manually.

## Checks

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` from this directory.
