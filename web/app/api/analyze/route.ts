import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { isEmptyAnalysis, parseAnalysisResult } from "@/lib/lead-schema";

export const maxDuration = 60;

const MAX_AUDIO_SIZE = 12 * 1024 * 1024;

const AUDIO_TYPES: Record<string, { mimeType: string; acceptedTypes: string[] }> = {
  mp3: { mimeType: "audio/mp3", acceptedTypes: ["audio/mpeg", "audio/mp3"] },
  wav: { mimeType: "audio/wav", acceptedTypes: ["audio/wav", "audio/x-wav"] },
  m4a: { mimeType: "audio/m4a", acceptedTypes: ["audio/mp4", "audio/x-m4a", "audio/m4a"] },
  ogg: { mimeType: "audio/ogg", acceptedTypes: ["audio/ogg", "application/ogg"] },
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description: "A verbatim transcription in the language spoken in the audio.",
    },
    lead: {
      type: Type.OBJECT,
      properties: {
        clientName: { type: Type.STRING, description: "Buyer name, or an empty string if not stated." },
        phoneNumber: { type: Type.STRING, description: "Phone number, or an empty string if not stated." },
        propertyType: { type: Type.STRING, description: "Property type, or an empty string if not stated." },
        budget: { type: Type.STRING, description: "Buyer budget, or an empty string if not stated." },
        location: { type: Type.STRING, description: "Desired property location, or an empty string if not stated." },
        status: {
          type: Type.STRING,
          enum: ["hot", "warm", "cold", "unknown"],
          description: "Lead intent classification; use unknown if the conversation does not establish it.",
        },
        followUpDateTime: {
          type: Type.STRING,
          description: "Explicitly stated follow-up date/time as ISO 8601 with local offset, or empty if none.",
        },
        whatsappMessage: {
          type: Type.STRING,
          description: "A brief WhatsApp follow-up that can be sent when the scheduled reminder is due, without mentioning any date, day, time, or appointment.",
        },
      },
      required: [
        "clientName",
        "phoneNumber",
        "propertyType",
        "budget",
        "location",
        "status",
        "followUpDateTime",
        "whatsappMessage",
      ],
    },
  },
  required: ["transcript", "lead"],
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AUDIO_SIZE + 128 * 1024) {
    return errorResponse("This audio file is larger than 12 MB. Choose a shorter recording and try again.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The upload could not be read. Choose an audio file and try again.", 400);
  }

  const audio = formData.get("audio");
  if (!audio || typeof audio === "string") {
    return errorResponse("Choose an audio file before generating a follow-up.", 400);
  }
  if (audio.size === 0) {
    return errorResponse("The selected audio file is empty. Choose another recording and try again.", 400);
  }
  if (audio.size > MAX_AUDIO_SIZE) {
    return errorResponse("This audio file is larger than 12 MB. Choose a shorter recording and try again.", 413);
  }

  const extension = audio.name.split(".").pop()?.toLowerCase() ?? "";
  const audioType = AUDIO_TYPES[extension];
  if (!audioType || (audio.type && !audioType.acceptedTypes.includes(audio.type))) {
    return errorResponse("Choose an MP3, WAV, M4A, or OGG audio file.", 415);
  }

  const clientNow = formData.get("clientNow");
  const timeZone = formData.get("timeZone");
  if (
    typeof clientNow !== "string" ||
    !Number.isFinite(Date.parse(clientNow)) ||
    typeof timeZone !== "string"
  ) {
    return errorResponse("The browser's date or time zone could not be read. Refresh the page and try again.", 400);
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    return errorResponse("The browser's time zone is invalid. Refresh the page and try again.", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("Gemini is not configured. Add GEMINI_API_KEY to web/.env.local and restart the app.", 503);
  }

  const prompt = [
    "Analyze the attached real estate call or voice note.",
    "Transcribe the conversation verbatim in its original language.",
    "Extract only facts explicitly stated; do not invent or infer missing names, phone numbers, property details, budgets, locations, or dates.",
    "Classify lead status as hot, warm, cold, or unknown. Use unknown unless buyer intent is clear.",
    "If a follow-up date and time are explicitly agreed, normalize it to ISO 8601 including the UTC offset for the user's local time zone. If none is stated, return an empty string. Do not create a default time; the app handles defaults.",
    "Write a short, professional WhatsApp follow-up that the agent can send when the scheduled reminder becomes due. Personalize it using only the buyer's stated needs.",
    "Do not mention a date, day, time, appointment, or when the agent will follow up. The message must read naturally when sent at the reminder time, without referring to that reminder.",
    "Do not claim that a property, document, or action is ready unless the conversation says so.",
    `The user's current local time is ${clientNow}. The user's IANA time zone is ${timeZone}.`,
    "Return only the requested structured JSON.",
  ].join("\n");

  try {
    const audioData = Buffer.from(await audio.arrayBuffer()).toString("base64");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: [
        { type: "text", text: prompt },
        { type: "audio", mime_type: audioType.mimeType, data: audioData },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseSchema,
      },
    });

    if (!response.output_text) {
      return errorResponse("Gemini returned an empty analysis. Please try another recording.", 502);
    }

    let result: unknown;
    try {
      result = JSON.parse(response.output_text);
    } catch {
      return errorResponse("Gemini returned an unreadable analysis. Please try again.", 502);
    }

    const parsed = parseAnalysisResult(result);
    if (!parsed) {
      return errorResponse("Gemini returned incomplete lead details. Please try again.", 502);
    }

    if (isEmptyAnalysis(parsed)) {
      return errorResponse(
        "We couldn't detect clear speech or any lead details in this recording. Please try again with a clearer audio clip.",
        422,
      );
    }

    return NextResponse.json({
      transcript: parsed.transcript,
      lead: {
        ...parsed.lead,
        clientName: parsed.lead.clientName.trim(),
        phoneNumber: parsed.lead.phoneNumber.trim(),
        propertyType: parsed.lead.propertyType.trim(),
        budget: parsed.lead.budget.trim(),
        location: parsed.lead.location.trim(),
        followUpDateTime: parsed.lead.followUpDateTime.trim(),
        whatsappMessage: parsed.lead.whatsappMessage.trim(),
      },
    });
  } catch (error) {
    console.error(
      "Gemini audio analysis failed:",
      error instanceof Error ? error.message : "Unknown provider error",
    );
    return errorResponse("Gemini could not analyze this recording. Check your connection and try again.", 502);
  }
}
