---
doc: scope
status: approved
---

# Real Estate Follow-Up Copilot

A local web app that turns a real estate call recording or voice note into a lead record and a ready-to-send follow-up.

## The Unique Kernel
From one uploaded conversation, the app extracts the buyer's needs, schedules the next follow-up, and drafts an editable, personalized WhatsApp message that is ready to send when due without mentioning a date or time—so an agent does not have to turn call notes into several separate CRM tasks.

## Who It's For
Real estate agents and property marketing teams without their own CRM or who cannot afford one. Today they rely on handwritten notes and phone call logs, risking lost details and delayed follow-ups.

## The Core Loop
The agent uploads a call recording or voice note. The app transcribes it and uses the conversation to create an editable lead card, follow-up time, and tailored WhatsApp draft that does not mention the schedule. When the time comes, the open app reminds the agent; they open WhatsApp with the message prefilled and review and send it manually.

## Inspiration & Identity
A simple, local web app focused on getting an agent from conversation to next action without manual data entry. No external design inspiration specified.

## Why This Matters to the Learner
The learner wants to solve a real-world problem for real estate agents and practice acting as the architect who guides AI coding agents while they write the code.

## What "Working" Looks Like
In a short on-screen demo, the agent uploads an audio file. The app transcribes it and displays a structured lead card (for example, Rahul, a 2BHK in Kharghar, budget 80 lakhs, hot lead), a reminder (for example, Friday at 4:00 PM), and a personalized WhatsApp draft. The agent clicks to open WhatsApp with the draft ready to review and send. When a scheduled follow-up becomes due while the app is open, it shows a notification with a default ringtone. The target is to complete the demo flow in under 60 seconds, with AI results appearing in under 2 seconds.

## The POC Boundary
- A local web app for one agent's follow-up workflow.
- Upload one call recording or voice note in `.mp3`, `.wav`, `.m4a`, or `.ogg` format.
- Transcribe the recording and use AI to extract lead details, follow-up timing, and a personalized WhatsApp message.
- If no follow-up time is stated, use default follow-up settings; the exact defaults remain to be defined.
- Show the extracted information as a lead card with a scheduled reminder and WhatsApp draft.
- At the due time, notify the agent with a default ringtone while the local app is open.
- Open WhatsApp with the message prefilled; the agent reviews and sends it.

## Later
- Reminders delivered while the browser or app is closed; this would require persistent backend and web-push setup.
- A fuller CRM or multi-agent workflow.

## Explicitly Cut
- Sending WhatsApp messages automatically. The agent must be able to review and send the prefilled message.
- Persistent push notifications when the app is closed. They are outside this short local-app proof of concept.
