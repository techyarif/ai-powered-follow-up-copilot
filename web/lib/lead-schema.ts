export const LEAD_STATUSES = ["hot", "warm", "cold", "unknown"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type AnalyzedLead = {
  clientName: string;
  phoneNumber: string;
  propertyType: string;
  budget: string;
  location: string;
  status: LeadStatus;
  followUpDateTime: string;
  whatsappMessage: string;
};

export type AnalysisResult = {
  transcript: string;
  lead: AnalyzedLead;
};

const EMPTY_ANALYSIS_VALUES = new Set([
  "",
  "unknown",
  "n/a",
  "na",
  "none",
  "not provided",
  "not available",
  "unavailable",
  "null",
  "undefined",
  "no speech detected",
  "no intelligible speech",
  "unintelligible",
  "inaudible",
  "no transcript",
  "no transcription",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMeaningfulText(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\[\]()]/g, "")
    .replace(/[.!?]/g, "")
    .replace(/\s+/g, " ");

  return !EMPTY_ANALYSIS_VALUES.has(normalized);
}

export function isEmptyAnalysis(result: AnalysisResult) {
  const { transcript, lead } = result;
  const hasLeadDetails =
    lead.status !== "unknown" ||
    [
      lead.clientName,
      lead.phoneNumber,
      lead.propertyType,
      lead.budget,
      lead.location,
      lead.followUpDateTime,
    ].some(hasMeaningfulText);

  return !hasMeaningfulText(transcript) && !hasLeadDetails;
}

export function parseAnalysisResult(value: unknown): AnalysisResult | null {
  if (!isRecord(value) || !isRecord(value.lead)) {
    return null;
  }

  const { transcript, lead } = value;
  const stringFields = [
    "clientName",
    "phoneNumber",
    "propertyType",
    "budget",
    "location",
    "followUpDateTime",
    "whatsappMessage",
  ] as const;

  if (
    typeof transcript !== "string" ||
    !stringFields.every((field) => typeof lead[field] === "string") ||
    !LEAD_STATUSES.includes(lead.status as LeadStatus)
  ) {
    return null;
  }

  return {
    transcript,
    lead: {
      clientName: lead.clientName as string,
      phoneNumber: lead.phoneNumber as string,
      propertyType: lead.propertyType as string,
      budget: lead.budget as string,
      location: lead.location as string,
      status: lead.status as LeadStatus,
      followUpDateTime: lead.followUpDateTime as string,
      whatsappMessage: lead.whatsappMessage as string,
    },
  };
}
