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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
