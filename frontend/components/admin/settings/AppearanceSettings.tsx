import { PanelLeft, Sun } from "lucide-react";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsToggle } from "@/components/admin/settings/SettingsToggle";
import type { ThemePreference } from "@/types/settings";

export function AppearanceSettings({
  theme,
  onThemeChange,
  isSidebarCollapsed,
  onSidebarCollapsedChange,
  onSave,
}: {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isSidebarCollapsed: boolean;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  onSave: () => void;
}) {
  return (
    <SettingsSection
      description="Adjust the admin workspace appearance and navigation density."
      icon={<Sun aria-hidden="true" size={19} />}
      id="appearance-settings"
      onSave={onSave}
      title="Appearance Settings"
    >
      <fieldset>
        <legend className="text-sm font-medium text-text">Theme</legend>
        <label className="mt-3 flex max-w-sm cursor-pointer items-center gap-3 rounded-md border border-secondary bg-teal-50/50 p-3">
          <input
            checked={theme === "light"}
            className="size-4 accent-secondary"
            name="admin-theme"
            onChange={() => onThemeChange("light")}
            type="radio"
            value="light"
          />
          <span className="flex size-9 items-center justify-center rounded-md border border-border bg-white text-secondary">
            <Sun aria-hidden="true" size={17} />
          </span>
          <span>
            <span className="block text-sm font-medium text-primary">Light theme</span>
            <span className="mt-0.5 block text-xs text-muted">Current supported theme</span>
          </span>
        </label>
        <p className="mt-2 text-[11px] leading-5 text-muted">
          Dark theme is not available in this demo.
        </p>
      </fieldset>

      <div className="border-t border-border pt-3">
        <SettingsToggle
          checked={isSidebarCollapsed}
          description="Use the compact icon-only sidebar. This updates the shared admin layout."
          label="Compact sidebar"
          onChange={onSidebarCollapsedChange}
        />
      </div>
      <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-xs leading-5 text-muted">
        <PanelLeft aria-hidden="true" className="mt-0.5 shrink-0 text-secondary" size={15} />
        <p>The sidebar can also be expanded or collapsed using its control.</p>
      </div>
    </SettingsSection>
  );
}
