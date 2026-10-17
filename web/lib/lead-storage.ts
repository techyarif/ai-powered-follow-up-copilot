import type { AnalysisResult, LeadStatus } from "@/lib/lead-schema";

const LEADS_KEY = "follow-up-copilot:leads:v1";
const ACTIVE_LEAD_KEY = "follow-up-copilot:active-lead:v1";
const LEAD_STATUSES: LeadStatus[] = ["hot", "warm", "cold", "unknown"];

export type LeadRecord = AnalysisResult["lead"] & {
  id: string;
  createdAt: string;
  transcript: string;
  followUpAt: string;
  followUpManuallyEdited: boolean;
  reminderNotifiedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLead(value: unknown): LeadRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const stringFields = [
    "id",
    "createdAt",
    "transcript",
    "clientName",
    "phoneNumber",
    "propertyType",
    "budget",
    "location",
    "followUpDateTime",
    "followUpAt",
    "whatsappMessage",
  ] as const;

  if (
    !stringFields.every((field) => typeof value[field] === "string") ||
    !LEAD_STATUSES.includes(value.status as LeadStatus) ||
    typeof value.followUpManuallyEdited !== "boolean" ||
    !(value.reminderNotifiedAt === null || typeof value.reminderNotifiedAt === "string") ||
    !Number.isFinite(Date.parse(value.createdAt as string)) ||
    !Number.isFinite(Date.parse(value.followUpAt as string))
  ) {
    return null;
  }

  return value as LeadRecord;
}

export function loadLeads(): LeadRecord[] {
  const saved = window.localStorage.getItem(LEADS_KEY);
  if (!saved) {
    return [];
  }

  let value: unknown;
  try {
    value = JSON.parse(saved);
  } catch {
    throw new Error("Saved leads could not be read because their data is invalid.");
  }

  if (!Array.isArray(value)) {
    throw new Error("Saved leads could not be read because their data is invalid.");
  }

  const leads: LeadRecord[] = [];
  for (const savedLead of value) {
    const lead = parseLead(savedLead);
    if (!lead) {
      throw new Error("Saved leads could not be read because a lead record is invalid.");
    }
    leads.push(lead);
  }

  return leads;
}

export function loadActiveLeadId(): string | null {
  return window.localStorage.getItem(ACTIVE_LEAD_KEY);
}

export function saveLeads(leads: LeadRecord[]) {
  window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function saveActiveLeadId(id: string | null) {
  if (id) {
    window.localStorage.setItem(ACTIVE_LEAD_KEY, id);
  } else {
    window.localStorage.removeItem(ACTIVE_LEAD_KEY);
  }
}
