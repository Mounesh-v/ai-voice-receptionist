"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Bot,
  Building2,
  CalendarClock,
  ChevronRight,
  House,
  Palette,
  UserRound,
  X,
} from "lucide-react";
import { AIReceptionistSettings } from "@/components/admin/settings/AIReceptionistSettings";
import { AppointmentSettings } from "@/components/admin/settings/AppointmentSettings";
import { AppearanceSettings } from "@/components/admin/settings/AppearanceSettings";
import { GeneralSettings } from "@/components/admin/settings/GeneralSettings";
import { NotificationSettings } from "@/components/admin/settings/NotificationSettings";
import { ProfileSettings } from "@/components/admin/settings/ProfileSettings";
import { useAdminLayoutSettings } from "@/components/admin/AdminLayout";
import {
  initialAIReceptionistSettings,
  initialAppointmentSettings,
  initialGeneralSettings,
  initialNotificationSettings,
  initialProfileSettings,
} from "@/data/settings";
import type {
  AIReceptionistSettingsValues,
  AppointmentSettingsValues,
  GeneralSettingsValues,
  NotificationSettingsValues,
  ProfileSettingsValues,
  ThemePreference,
} from "@/types/settings";

const settingsNavigation = [
  { id: "general-settings", label: "General", icon: Building2 },
  { id: "appointment-settings", label: "Appointments", icon: CalendarClock },
  { id: "ai-receptionist-settings", label: "AI Receptionist", icon: Bot },
  { id: "notification-settings", label: "Notifications", icon: BellRing },
  { id: "appearance-settings", label: "Appearance", icon: Palette },
  { id: "profile-settings", label: "Account & Profile", icon: UserRound },
];

type Feedback = {
  type: "success" | "error";
  message: string;
};

export function SettingsManagement() {
  const [general, setGeneral] = useState<GeneralSettingsValues>(
    initialGeneralSettings,
  );
  const [appointments, setAppointments] =
    useState<AppointmentSettingsValues>(initialAppointmentSettings);
  const [aiReceptionist, setAIReceptionist] =
    useState<AIReceptionistSettingsValues>(initialAIReceptionistSettings);
  const [notifications, setNotifications] =
    useState<NotificationSettingsValues>(initialNotificationSettings);
  const [profile, setProfile] = useState<ProfileSettingsValues>(
    initialProfileSettings,
  );
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const { isSidebarCollapsed, setSidebarCollapsed } = useAdminLayoutSettings();

  const save = (section: string) => {
    setFeedback({
      type: "success",
      message: `${section} saved to local demo state only.`,
    });
  };

  const updateGeneral = (updates: Partial<GeneralSettingsValues>) => {
    setGeneral((current) => ({ ...current, ...updates }));
    setFeedback(null);
  };

  const updateAI = (updates: Partial<AIReceptionistSettingsValues>) => {
    setAIReceptionist((current) => ({ ...current, ...updates }));
    setFeedback(null);
  };

  const updateProfile = (updates: Partial<ProfileSettingsValues>) => {
    setProfile((current) => ({ ...current, ...updates }));
    setFeedback(null);
  };

  const saveGeneral = () => {
    if (
      !general.clinicName.trim() ||
      !general.contactEmail.trim() ||
      !general.phoneNumber.trim() ||
      !general.address.trim()
    ) {
      setFeedback({
        type: "error",
        message: "Complete all required hospital contact fields before saving.",
      });
      return;
    }
    if (!isValidEmail(general.contactEmail)) {
      setFeedback({
        type: "error",
        message: "Enter a valid contact email address.",
      });
      return;
    }
    save("General settings");
  };

  const saveAI = () => {
    if (
      !aiReceptionist.displayName.trim() ||
      !aiReceptionist.greeting.trim() ||
      !aiReceptionist.afterHoursMessage.trim()
    ) {
      setFeedback({
        type: "error",
        message: "Complete the required receptionist fields before saving.",
      });
      return;
    }
    save("AI receptionist demo settings");
  };

  const saveProfile = () => {
    if (!profile.displayName.trim() || !profile.email.trim()) {
      setFeedback({
        type: "error",
        message: "Enter an admin name and email address before saving.",
      });
      return;
    }
    if (!isValidEmail(profile.email)) {
      setFeedback({
        type: "error",
        message: "Enter a valid admin email address.",
      });
      return;
    }
    save("Account profile");
  };

  return (
    <div className="space-y-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5">
          <Link
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-secondary"
            href="/admin/dashboard"
          >
            <House aria-hidden="true" size={13} />
            Dashboard
          </Link>
          <ChevronRight aria-hidden="true" className="text-muted" size={13} />
          <span aria-current="page" className="text-xs font-medium text-text">
            Settings
          </span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Configure hospital preferences and admin workspace options.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-2 shadow-sm sm:grid-cols-3 lg:sticky lg:top-6 lg:flex lg:flex-col"
        >
          {settingsNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <a
                className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted transition-colors hover:bg-slate-50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
                href={`#${item.id}`}
                key={item.id}
              >
                <Icon aria-hidden="true" className="shrink-0" size={15} />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-5">
          <GeneralSettings
            onChange={updateGeneral}
            onSave={saveGeneral}
            values={general}
          />
          <AppointmentSettings
            onChange={(updates) => {
              setAppointments((current) => ({ ...current, ...updates }));
              setFeedback(null);
            }}
            onSave={() => save("Appointment settings")}
            values={appointments}
          />
          <AIReceptionistSettings
            onChange={updateAI}
            onSave={saveAI}
            values={aiReceptionist}
          />
          <NotificationSettings
            onChange={(updates) => {
              setNotifications((current) => ({ ...current, ...updates }));
              setFeedback(null);
            }}
            onSave={() => save("Notification preferences")}
            values={notifications}
          />
          <AppearanceSettings
            isSidebarCollapsed={isSidebarCollapsed}
            onSave={() => save("Appearance settings")}
            onSidebarCollapsedChange={setSidebarCollapsed}
            onThemeChange={setTheme}
            theme={theme}
          />
          <ProfileSettings
            onChange={updateProfile}
            onSave={saveProfile}
            values={profile}
          />
        </div>
      </div>

      {feedback && (
        <div
          aria-live={feedback.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${
            feedback.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          <p>{feedback.message}</p>
          <button
            aria-label="Dismiss settings message"
            className="shrink-0 font-semibold"
            onClick={() => setFeedback(null)}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
