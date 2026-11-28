"use client";

import { useEffect, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { SettingsField } from "@/components/admin/settings/SettingsField";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import type { ProfileSettingsValues } from "@/types/settings";

const fieldClassName =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15";

export function ProfileSettings({
  values,
  onChange,
  onSave,
}: {
  values: ProfileSettingsValues;
  onChange: (updates: Partial<ProfileSettingsValues>) => void;
  onSave: () => void;
}) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <SettingsSection
        description="Manage the administrator profile displayed in this workspace."
        icon={<UserRound aria-hidden="true" size={19} />}
        id="profile-settings"
        onSave={onSave}
        title="Account & Profile Settings"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            aria-label={`Profile image placeholder for ${values.displayName || "admin"}`}
            className="flex size-16 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-teal-50 text-lg font-semibold text-secondary"
            role="img"
          >
            {getInitials(values.displayName)}
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Profile image placeholder</p>
            <p className="mt-1 text-xs text-muted">
              Profile image upload is not available in this frontend demo.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Admin display name" required>
            <input
              aria-label="Admin display name"
              autoComplete="name"
              className={fieldClassName}
              onChange={(event) => onChange({ displayName: event.target.value })}
              required
              value={values.displayName}
            />
          </SettingsField>
          <SettingsField label="Email address" required>
            <input
              aria-label="Admin email address"
              autoComplete="email"
              className={fieldClassName}
              onChange={(event) => onChange({ email: event.target.value })}
              required
              type="email"
              value={values.email}
            />
          </SettingsField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-text">Password</p>
            <p className="mt-1 text-xs text-muted">
              Password changes are not connected to authentication.
            </p>
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-text transition-colors hover:border-secondary hover:text-secondary"
            onClick={() => setPasswordDialogOpen(true)}
            type="button"
          >
            <KeyRound aria-hidden="true" size={15} />
            Change Password
          </button>
        </div>
      </SettingsSection>
      {passwordDialogOpen && (
        <ChangePasswordDialog onClose={() => setPasswordDialogOpen(false)} />
      )}
    </>
  );
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.document.addEventListener("keydown", handleKeyDown);
    return () => window.document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close change password dialog"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="password-demo-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <h2 className="text-lg font-semibold text-primary" id="password-demo-title">
          Change password
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This dialog is a visual demonstration only. No password is collected or changed.
        </p>
        <div
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900"
          role="note"
        >
          Authentication and password management are not connected in this frontend-only project.
        </div>
        <div className="mt-4 space-y-3">
          <SettingsField label="Current password">
            <input
              aria-label="Current password"
              autoComplete="off"
              className={`${fieldClassName} bg-slate-50`}
              disabled
              placeholder="Unavailable in demo"
              type="password"
            />
          </SettingsField>
          <SettingsField label="New password">
            <input
              aria-label="New password"
              autoComplete="off"
              className={`${fieldClassName} bg-slate-50`}
              disabled
              placeholder="Unavailable in demo"
              type="password"
            />
          </SettingsField>
        </div>
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <button
            className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
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

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  return initials || "A";
}
