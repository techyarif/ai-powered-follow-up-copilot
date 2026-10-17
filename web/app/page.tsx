"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { parseAnalysisResult } from "@/lib/lead-schema";
import type { LeadStatus } from "@/lib/lead-schema";
import {
  loadActiveLeadId,
  loadLeads,
  saveActiveLeadId,
  saveLeads,
} from "@/lib/lead-storage";
import type { LeadRecord } from "@/lib/lead-storage";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_AUDIO = new Set(["mp3", "wav", "m4a", "ogg"]);
const STATUS_LABEL: Record<LeadStatus, string> = {
  hot: "Hot lead",
  warm: "Warm lead",
  cold: "Cold lead",
  unknown: "Unknown status",
};

type DisplayLead = Omit<LeadRecord, "followUpAt"> & {
  followUpAt: Date;
};

const fieldClasses =
  "field mt-1.5 min-h-11 w-full rounded-lg px-3 text-sm transition placeholder:text-slate-500 focus:border-emerald-400";

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function toLocalDateTimeInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getFallbackFollowUp(status: LeadStatus, now: Date) {
  const hours = status === "hot" ? 4 : status === "cold" ? 72 : 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function toDisplayLead(record: LeadRecord): DisplayLead {
  return { ...record, followUpAt: new Date(record.followUpAt) };
}

function toLeadRecord(lead: DisplayLead): LeadRecord {
  return { ...lead, followUpAt: lead.followUpAt.toISOString() };
}

function formatFollowUp(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function playReminderChime(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(660, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.44);
}

function getWhatsAppHref(phoneNumber: string, message: string) {
  const phone = phoneNumber.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(phone)) {
    return null;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getStatusStyle(status: LeadStatus) {
  if (status === "hot") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  if (status === "warm") return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  if (status === "cold") return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-300";
}

function HeadsetMark() {
  return (
    <span className="flex size-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M4 13v-1a8 8 0 0 1 16 0v1M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </span>
  );
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [reminderError, setReminderError] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [storageError, setStorageError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [leads, setLeads] = useState<DisplayLead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lead = leads.find((savedLead) => savedLead.id === activeLeadId) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedLeads = loadLeads();
        const savedActiveLeadId = loadActiveLeadId();
        const activeLead =
          savedLeads.find((savedLead) => savedLead.id === savedActiveLeadId) ??
          savedLeads[0] ??
          null;

        setLeads(savedLeads.map(toDisplayLead));
        setActiveLeadId(activeLead?.id ?? null);
      } catch (error) {
        setStorageAvailable(false);
        setStorageError(
          error instanceof Error
            ? `${error.message} Saved leads will not be changed, and this session cannot persist updates.`
            : "Saved leads could not be read. This session cannot persist updates.",
        );
      } finally {
        setNotificationPermission(
          "Notification" in window ? Notification.permission : "unsupported",
        );
        setStorageReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || !storageAvailable) {
      return;
    }

    try {
      saveLeads(leads.map(toLeadRecord));
      saveActiveLeadId(activeLeadId);
    } catch (error) {
      const message =
        error instanceof Error
          ? `Lead changes could not be saved: ${error.message}. This session can continue, but reload may lose updates.`
          : "Lead changes could not be saved. This session can continue, but reload may lose updates.";
      window.setTimeout(() => {
        setStorageAvailable(false);
        setStorageError(message);
      }, 0);
    }
  }, [activeLeadId, leads, storageAvailable, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    function checkDueReminders() {
      const now = new Date();
      const dueLeads = leads.filter(
        (savedLead) =>
          !savedLead.reminderNotifiedAt && savedLead.followUpAt <= now,
      );
      if (dueLeads.length === 0) {
        return;
      }

      const notifiedAt = now.toISOString();
      const dueIds = new Set(dueLeads.map((savedLead) => savedLead.id));
      setLeads((currentLeads) =>
        currentLeads.map((savedLead) =>
          dueIds.has(savedLead.id)
            ? { ...savedLead, reminderNotifiedAt: notifiedAt }
            : savedLead,
        ),
      );

      const fallbackReasons: string[] = [];
      if (!storageAvailable) {
        fallbackReasons.push("The reminder marker cannot be saved for reloads in this browser session.");
      }
      if (notificationPermission === "granted") {
        for (const dueLead of dueLeads) {
          try {
            new Notification("Real estate follow-up is due", {
              body: `Follow up with ${dueLead.clientName.trim() || "your lead"}.`,
              tag: `follow-up-${dueLead.id}`,
            });
          } catch (error) {
            fallbackReasons.push(
              error instanceof Error
                ? `Browser notification failed: ${error.message}`
                : "Browser notification could not be shown.",
            );
          }
        }
      } else if (notificationPermission === "denied") {
        fallbackReasons.push("Browser notifications are blocked; use the in-app reminder.");
      } else if (notificationPermission === "unsupported") {
        fallbackReasons.push("This browser does not support notifications; use the in-app reminder.");
      } else {
        fallbackReasons.push("Enable browser notifications to receive system alerts.");
      }

      const audioContext = audioContextRef.current;
      if (audioContext?.state === "running") {
        try {
          playReminderChime(audioContext);
        } catch (error) {
          fallbackReasons.push(
            error instanceof Error
              ? `The reminder sound could not play: ${error.message}`
              : "The reminder sound could not play.",
          );
        }
      } else {
        fallbackReasons.push("The reminder sound is unavailable; use the in-app reminder.");
      }

      setReminderError(fallbackReasons.join(" "));
    }

    const initialCheck = window.setTimeout(checkDueReminders, 0);
    const timer = window.setInterval(checkDueReminders, 15_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [leads, notificationPermission, storageAvailable, storageReady]);

  useEffect(() => {
    if (!processing) {
      return;
    }

    const timer = window.setTimeout(() => setProgressStage(1), 1800);
    return () => window.clearTimeout(timer);
  }, [processing]);

  async function enableReminders() {
    setReminderError("");

    try {
      if (typeof AudioContext === "undefined") {
        throw new Error("This browser does not support reminder audio.");
      }

      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      if (context.state !== "running") {
        await context.resume();
      }
      if (context.state !== "running") {
        throw new Error("The browser did not allow reminder audio.");
      }
    } catch (error) {
      setReminderError(
        error instanceof Error
          ? `${error.message} The in-app reminder will still appear when a follow-up is due.`
          : "Reminder audio could not be enabled. The in-app reminder will still appear.",
      );
    }

    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setReminderError("This browser does not support system notifications. The in-app reminder will still appear.");
      return;
    }

    if (Notification.permission === "denied") {
      setNotificationPermission("denied");
      setReminderError("Notifications are blocked by the browser. Allow them in browser settings; the in-app reminder will still appear.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        setReminderError("Notification permission was not granted. The in-app reminder will still appear.");
      }
    } catch (error) {
      setReminderError(
        error instanceof Error
          ? `Notification permission could not be requested: ${error.message}`
          : "Notification permission could not be requested. The in-app reminder will still appear.",
      );
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setErrorMessage("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (!ACCEPTED_AUDIO.has(getExtension(file.name))) {
      setErrorMessage("Choose an MP3, WAV, M4A, or OGG audio file.");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("This audio file is larger than 12 MB. Choose a shorter recording and try again.");
      event.currentTarget.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function analyzeAudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || processing) {
      return;
    }

    setProcessing(true);
    setProgressStage(0);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.set("audio", selectedFile);
      formData.set("clientNow", new Date().toISOString());
      formData.set(
        "timeZone",
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      );

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "We couldn't analyze this recording. Please try again.";
        throw new Error(message);
      }

      const parsed = parseAnalysisResult(result);
      if (!parsed) {
        throw new Error("The analysis response was incomplete. Please try again.");
      }

      const now = new Date();
      const explicitFollowUp = parsed.lead.followUpDateTime
        ? new Date(parsed.lead.followUpDateTime)
        : null;
      const hasFutureExplicitFollowUp =
        explicitFollowUp !== null &&
        Number.isFinite(explicitFollowUp.getTime()) &&
        explicitFollowUp > now;
      const followUpAt =
        hasFutureExplicitFollowUp && explicitFollowUp
          ? explicitFollowUp
          : getFallbackFollowUp(parsed.lead.status, now);

      const newLead: DisplayLead = {
        ...parsed.lead,
        id: crypto.randomUUID(),
        createdAt: now.toISOString(),
        reminderNotifiedAt: null,
        followUpDateTime: hasFutureExplicitFollowUp
          ? parsed.lead.followUpDateTime
          : "",
        transcript: parsed.transcript,
        followUpAt,
        followUpManuallyEdited: false,
      };
      setLeads((currentLeads) => [newLead, ...currentLeads]);
      setActiveLeadId(newLead.id);
      setScheduleError("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't analyze this recording. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function selectLead(id: string) {
    setActiveLeadId(id);
    setScheduleError("");
    setTranscriptOpen(false);
  }

  function deleteActiveLead() {
    if (!lead) {
      return;
    }

    const name = lead.clientName.trim() || "this lead";
    if (!window.confirm(`Delete ${name} and its saved transcript? This cannot be undone.`)) {
      return;
    }

    const remainingLeads = leads.filter((savedLead) => savedLead.id !== lead.id);
    setLeads(remainingLeads);
    setActiveLeadId(remainingLeads[0]?.id ?? null);
    setScheduleError("");
    setReminderError("");
    setTranscriptOpen(false);
  }

  function updateLeadField(field: "clientName" | "phoneNumber" | "propertyType" | "budget" | "location" | "whatsappMessage", value: string) {
    setLeads((currentLeads) =>
      currentLeads.map((current) =>
        current.id === activeLeadId ? { ...current, [field]: value } : current,
      ),
    );
  }

  function updateLeadStatus(status: LeadStatus) {
    setLeads((currentLeads) =>
      currentLeads.map((current) =>
        current.id === activeLeadId
          ? {
              ...current,
              status,
              followUpAt: current.followUpManuallyEdited
                ? current.followUpAt
                : getFallbackFollowUp(status, new Date()),
              followUpDateTime: current.followUpManuallyEdited
                ? current.followUpDateTime
                : "",
              reminderNotifiedAt: current.followUpManuallyEdited
                ? current.reminderNotifiedAt
                : null,
            }
          : current,
      ),
    );
  }

  function updateFollowUpTime(event: ChangeEvent<HTMLInputElement>) {
    const followUpAt = new Date(event.currentTarget.value);
    if (!Number.isFinite(followUpAt.getTime()) || followUpAt <= new Date()) {
      setScheduleError("Choose a follow-up time in the future.");
      return;
    }

    setScheduleError("");
    setLeads((currentLeads) =>
      currentLeads.map((current) =>
        current.id === activeLeadId
          ? {
            ...current,
            followUpAt,
            followUpDateTime: followUpAt.toISOString(),
            followUpManuallyEdited: true,
            reminderNotifiedAt: null,
          }
          : current,
      ),
    );
  }

  const whatsappHref = lead
    ? getWhatsAppHref(lead.phoneNumber, lead.whatsappMessage)
    : null;
  const dueLeads = leads.filter((savedLead) => savedLead.followUpAt <= new Date());

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <HeadsetMark />
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              Follow Up Co-Pilot
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Real estate, remembered.</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Local workspace
        </div>
      </header>

      <section className="mx-auto w-full max-w-4xl pt-16 sm:pt-24">
        <div className="mb-9 text-center">
          <p className="eyebrow">A better next step starts here</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">
            AI Real Estate
            <span className="block text-emerald-300">Follow Up Co-Pilot</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-400">
            Turn a conversation into a clear next step. Upload a call recording
            and get the lead details, reminder, and message ready to review.
          </p>
        </div>

        <form onSubmit={analyzeAudio} className="surface rounded-3xl p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Start with a conversation</p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                Add a call recording or voice note
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                MP3, WAV, M4A, or OGG · Up to 12 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              aria-label="Upload call recording or voice note"
              className="hidden"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
              onChange={chooseFile}
              disabled={processing}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-xl border border-slate-600/80 bg-slate-800/70 px-5 text-sm font-semibold text-slate-100 transition hover:border-emerald-400/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
                <path
                  d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M3.5 12v3.5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              Upload recording
            </button>
          </div>

          {selectedFile && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">
                  {selectedFile.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze
                </p>
              </div>
              <button
                type="submit"
                disabled={processing}
                className="min-h-11 shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate follow-up
              </button>
            </div>
          )}

          {processing && (
            <div
              className="mt-6 flex items-center gap-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-4"
              role="status"
              aria-live="polite"
            >
              <div className="loading-bars flex h-6 items-center" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-100">
                  {progressStage === 0 ? "Transcribing audio..." : "Extracting lead insights..."}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Analyzing the conversation. This can take a little while.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              className="mt-5 flex flex-col gap-3 rounded-xl border border-rose-400/30 bg-rose-400/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="text-sm text-rose-100">{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  fileInputRef.current?.click();
                }}
                className="min-h-10 shrink-0 rounded-lg border border-rose-300/30 px-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/10"
              >
                Try Again
              </button>
            </div>
          )}
        </form>

        {storageError && (
          <p
            className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            {storageError}
          </p>
        )}

        {dueLeads.length > 0 && (
          <section
            className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] p-5"
            role="status"
            aria-live="polite"
            aria-label="Due follow-up reminders"
          >
            <p className="text-sm font-semibold text-amber-100">
              {dueLeads.length === 1 ? "A follow-up is due" : `${dueLeads.length} follow-ups are due`}
            </p>
            <div className="mt-3 space-y-3">
              {dueLeads.map((dueLead) => {
                const href = getWhatsAppHref(dueLead.phoneNumber, dueLead.whatsappMessage);
                return (
                  <div
                    key={dueLead.id}
                    className="flex flex-col gap-2 border-t border-amber-200/10 pt-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm text-amber-50">
                      {dueLead.clientName.trim() || "Unknown client"} · {formatFollowUp(dueLead.followUpAt)}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-emerald-200 underline decoration-emerald-200/40 underline-offset-4"
                      >
                        Open WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-amber-100/70">
                        Add a valid phone number to open WhatsApp.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {lead && (
          <section className="mt-8 space-y-5" aria-label="Generated follow-up dashboard">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Your next step is ready</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Lead follow-up
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(lead.status)}`}
                >
                  {STATUS_LABEL[lead.status]}
                </span>
                <button
                  type="button"
                  onClick={deleteActiveLead}
                  className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                >
                  Delete lead
                </button>
              </div>
            </div>

            {leads.length > 1 && (
              <nav aria-label="Recent leads" className="surface rounded-2xl p-4 sm:p-5">
                <p className="eyebrow">Recent leads</p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {leads.map((recentLead) => {
                    const isActive = recentLead.id === activeLeadId;
                    return (
                      <button
                        key={recentLead.id}
                        type="button"
                        onClick={() => selectLead(recentLead.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`min-h-10 shrink-0 rounded-lg border px-3 text-left text-sm transition ${
                          isActive
                            ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                            : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {recentLead.clientName.trim() || "Unknown client"}
                        <span className="ml-2 text-xs text-slate-500">
                          {new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(recentLead.createdAt))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="surface rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="eyebrow">Lead details</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Edit any detail to correct the AI result.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-400">
                      Client name
                      <input
                        aria-label="Client name"
                        className={fieldClasses}
                        placeholder="Unknown"
                        value={lead.clientName}
                        onChange={(event) => updateLeadField("clientName", event.currentTarget.value)}
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-400">
                      Lead status
                      <select
                        aria-label="Lead status"
                        className={fieldClasses}
                        value={lead.status}
                        onChange={(event) => {
                          const status = event.currentTarget.value;
                          if (status === "hot" || status === "warm" || status === "cold" || status === "unknown") {
                            updateLeadStatus(status);
                          }
                        }}
                      >
                        <option value="hot">Hot</option>
                        <option value="warm">Warm</option>
                        <option value="cold">Cold</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-400">
                      Property type
                      <input
                        aria-label="Property type"
                        className={fieldClasses}
                        placeholder="Unknown"
                        value={lead.propertyType}
                        onChange={(event) => updateLeadField("propertyType", event.currentTarget.value)}
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-400">
                      Location
                      <input
                        aria-label="Location"
                        className={fieldClasses}
                        placeholder="Unknown"
                        value={lead.location}
                        onChange={(event) => updateLeadField("location", event.currentTarget.value)}
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-400">
                      Budget
                      <input
                        aria-label="Budget"
                        className={fieldClasses}
                        placeholder="Unknown"
                        value={lead.budget}
                        onChange={(event) => updateLeadField("budget", event.currentTarget.value)}
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-400">
                      Phone number
                      <input
                        aria-label="Phone number"
                        className={fieldClasses}
                        inputMode="tel"
                        placeholder="Add a valid number with country code"
                        value={lead.phoneNumber}
                        onChange={(event) => updateLeadField("phoneNumber", event.currentTarget.value)}
                      />
                    </label>
                  </div>
              </article>

              <article className="surface rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-200">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
                      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <div>
                    <p className="eyebrow">Follow-up reminder</p>
                    <p className="mt-1 text-sm font-semibold text-white">Your next conversation</p>
                  </div>
                </div>
                <label className="mt-5 block text-xs font-medium text-slate-400">
                  Scheduled date and time
                  <input
                    aria-label="Scheduled follow-up date and time"
                    className={fieldClasses}
                    type="datetime-local"
                    min={toLocalDateTimeInput(new Date())}
                    value={toLocalDateTimeInput(lead.followUpAt)}
                    onChange={updateFollowUpTime}
                    aria-invalid={Boolean(scheduleError)}
                  />
                </label>
                {scheduleError ? (
                  <p className="mt-2 text-xs text-rose-300" role="alert">{scheduleError}</p>
                ) : (
                  <p className="mt-2 text-sm text-amber-100">
                    {formatFollowUp(lead.followUpAt)}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {lead.followUpManuallyEdited
                    ? "Time selected by you"
                    : lead.followUpDateTime
                      ? "Time mentioned in the conversation"
                      : `Suggested for ${STATUS_LABEL[lead.status].toLowerCase()}`}
                </p>
                <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/40 p-3">
                  {notificationPermission === "granted" ? (
                    <p className="text-xs text-emerald-200">
                      Browser notifications are enabled. Keep this app open for due reminders.
                    </p>
                  ) : notificationPermission === "denied" ? (
                    <p className="text-xs text-slate-300">
                      Notifications are blocked in browser settings. The in-app reminder will still appear while this app is open.
                    </p>
                  ) : notificationPermission === "unsupported" ? (
                    <p className="text-xs text-slate-300">
                      This browser does not support system notifications. The in-app reminder will still appear while this app is open.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-300">
                        Enable browser notifications and sound for follow-ups while this app is open.
                      </p>
                      <button
                        type="button"
                        onClick={enableReminders}
                        className="mt-3 min-h-10 rounded-lg border border-emerald-400/30 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                      >
                        Enable reminders
                      </button>
                    </>
                  )}
                  {reminderError && (
                    <p className="mt-2 text-xs text-amber-200" role="alert">
                      {reminderError}
                    </p>
                  )}
                </div>
              </article>
            </div>

            <article className="surface rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <label className="block flex-1 text-xs font-medium text-slate-400">
                  WhatsApp follow-up message
                  <textarea
                    aria-label="WhatsApp follow-up message"
                    className="field mt-2 min-h-32 w-full resize-y rounded-xl px-3 py-3 text-sm leading-6 text-slate-100 transition focus:border-emerald-400"
                    placeholder="Add a message for your follow-up"
                    value={lead.whatsappMessage}
                    onChange={(event) => updateLeadField("whatsappMessage", event.currentTarget.value)}
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Ready for you to send when the reminder is due. The message won’t include the scheduled date or time.
                  </span>
                </label>
                <a
                  href={whatsappHref ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!whatsappHref}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                    whatsappHref
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
                  }`}
                  onClick={(event) => {
                    if (!whatsappHref) event.preventDefault();
                  }}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
                    <path d="M10.1 2.3a7.5 7.5 0 0 0-6.45 11.32L2.5 17.5l4.02-1.05A7.5 7.5 0 1 0 10.1 2.3Zm0 13.5c-1.1 0-2.17-.29-3.12-.84l-.22-.13-2.39.63.64-2.33-.14-.24a6 6 0 1 1 5.23 2.91Zm3.3-4.5c-.18-.09-1.08-.54-1.25-.6-.17-.07-.29-.09-.41.09-.12.18-.48.6-.58.72-.11.12-.21.14-.39.05-.18-.09-.76-.28-1.45-.9-.54-.48-.9-1.08-1.01-1.26-.11-.18-.01-.28.08-.37.08-.08.18-.21.27-.32.09-.1.12-.18.18-.3.06-.12.03-.23-.02-.32-.04-.09-.41-.99-.56-1.35-.15-.35-.3-.3-.41-.3h-.35c-.12 0-.32.04-.49.23-.17.18-.64.63-.64 1.53s.66 1.77.75 1.89c.09.12 1.29 1.97 3.12 2.76.44.19.78.3 1.04.38.44.14.84.12 1.15.07.35-.05 1.08-.44 1.23-.87.15-.42.15-.78.11-.86-.05-.08-.17-.12-.35-.21Z" />
                  </svg>
                  Send via WhatsApp
                </a>
              </div>
              {!whatsappHref && (
                <p className="mt-3 text-xs text-slate-500">
                  Add a valid phone number to open this message in WhatsApp.
                </p>
              )}
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setTranscriptOpen((open) => !open)}
                aria-expanded={transcriptOpen}
                className="flex min-h-14 w-full items-center justify-between px-5 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-200">Audio transcript</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Review what was captured from the conversation
                  </span>
                </span>
                <span className="text-sm text-slate-400">{transcriptOpen ? "Hide" : "Show"}</span>
              </button>
              {transcriptOpen && (
                <p className="border-t border-slate-800 px-5 py-4 text-sm leading-7 text-slate-300">
                  {lead.transcript || "No transcript was returned."}
                </p>
              )}
            </article>
          </section>
        )}

        {!lead && !processing && !errorMessage && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Your recording is processed for this request and isn’t saved by this app.
          </p>
        )}
      </section>

      <footer className="mt-auto pt-16 text-center text-xs text-slate-600">
        Built to keep every good conversation moving forward.
      </footer>
    </main>
  );
}
