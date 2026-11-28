"use client";

import { useEffect } from "react";
import { CalendarDays, Clock3, Headphones, Phone, UserRound, X } from "lucide-react";
import type { CallRecord } from "@/types/call";

export function CallDetailsPanel({
  call,
  onClose,
}: {
  call: CallRecord;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close call details"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="call-details-title"
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-secondary">{call.id}</p>
            <h2 className="mt-1 text-lg font-semibold text-primary" id="call-details-title">
              Call details &amp; conversation
            </h2>
            <p className="mt-1 text-xs text-muted">Fictional sample call · demo data only</p>
          </div>
          <button
            aria-label="Close call details"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <section aria-label="Call information" className="grid gap-3 rounded-md border border-border bg-slate-50 p-4 sm:grid-cols-2">
          <Detail icon={UserRound} label="Patient" value={`${call.patientName} · ${call.patientId}`} />
          <Detail icon={Phone} label="Phone number" value={call.phone} />
          <Detail icon={CalendarDays} label="Call date" value={formatDate(call.date)} />
          <Detail icon={Clock3} label="Call time & duration" value={`${formatTime(call.time)} · ${formatDuration(call.durationSeconds)}`} />
          <Detail icon={Headphones} label="Purpose & outcome" value={`${call.purpose} · ${call.outcome}`} />
          <div className="min-w-0">
            <p className="text-[11px] text-muted">Call status</p>
            <p className="mt-1 text-xs font-medium text-text">{call.status}</p>
          </div>
        </section>

        {call.appointment && (
          <section aria-label="Associated appointment" className="mt-4 rounded-md border border-teal-100 bg-teal-50/70 p-4">
            <h3 className="text-xs font-semibold text-primary">Associated appointment</h3>
            <p className="mt-1 text-xs leading-5 text-text">
              {call.appointment.id} · {call.appointment.doctor} · {call.appointment.department} ·{" "}
              {formatDate(call.appointment.date)} at {formatTime(call.appointment.time)}
            </p>
          </section>
        )}

        <section aria-label="Conversation transcript" className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-primary">Conversation transcript</h3>
              <p className="mt-0.5 text-xs text-muted">Speaker labels and timestamps are from the sample record.</p>
            </div>
          </div>
          {call.transcript.length ? (
            <ol className="space-y-3">
              {call.transcript.map((message, index) => {
                const isAI = message.speaker === "AI Receptionist";
                return (
                  <li
                    className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                    key={`${message.time}-${index}`}
                  >
                    <article
                      className={`max-w-[92%] rounded-lg border px-3.5 py-3 sm:max-w-[82%] ${
                        isAI
                          ? "border-border bg-slate-50"
                          : "border-teal-100 bg-teal-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-5">
                        <p className="text-[11px] font-semibold text-primary">{message.speaker}</p>
                        <time className="text-[10px] text-muted">{message.time}</time>
                      </div>
                      <p className="mt-1.5 text-xs leading-5 text-text">{message.text}</p>
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="rounded-md border border-border bg-slate-50 px-4 py-3 text-xs leading-5 text-muted">
              No conversation transcript is available for this {call.status.toLowerCase()} call.
            </p>
          )}
        </section>

        <section
          aria-label="Audio recording"
          className="mt-5 flex items-start gap-3 rounded-md border border-dashed border-border bg-background px-4 py-3"
        >
          <Headphones aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={17} />
          <div>
            <h3 className="text-xs font-semibold text-text">Audio recording unavailable</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              No sample audio file is configured for this demo call.
            </p>
          </div>
        </section>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={15} />
      <div className="min-w-0">
        <p className="text-[11px] text-muted">{label}</p>
        <p className="mt-1 break-words text-xs font-medium text-text">{value}</p>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatDuration(seconds: number) {
  if (seconds === 0) return "0 sec";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}
