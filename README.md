# AI Real Estate Follow Up Co-Pilot

A local Next.js app that turns a real estate call recording or voice note into a transcript, lead summary, follow-up suggestion, and WhatsApp draft.

## Run locally

1. Install [Node.js](https://nodejs.org/) and get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `web/.env.example` to `web/.env.local` and add your key:

   ```text
   GEMINI_API_KEY=your-key
   ```

   Keep `.env.local` private. Never commit or share it.
3. In a terminal, run:

   ```powershell
   cd web
   npm install
   npm run dev
   ```
4. Open <http://localhost:3000>.

Upload one MP3, WAV, M4A, or OGG file up to 12 MB. Audio is sent to the Gemini API inline for analysis and is not saved by this app. Transcripts and editable lead details are saved in this browser's `localStorage`, where you can switch between recent leads or delete the active lead. Enable reminders from a lead card to receive a browser notification and chime when a follow-up is due; keep the app open for reminders to work. WhatsApp opens a prefilled draft for you to review and send manually.

## Checks

From `web/`, run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
