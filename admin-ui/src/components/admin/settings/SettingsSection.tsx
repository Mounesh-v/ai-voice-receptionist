import type { ReactNode } from "react";

export function SettingsSection({
  id,
  title,
  description,
  icon,
  children,
  onSave,
}: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  onSave: () => void;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 rounded-lg border border-border bg-card shadow-sm"
      id={id}
    >
      <header className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-secondary">
          {icon}
        </span>
        <div>
          <h2
            className="text-base font-semibold text-primary"
            id={`${id}-title`}
          >
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </header>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
      <footer className="flex justify-end border-t border-border px-5 py-4 sm:px-6">
        <button
          className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
          onClick={onSave}
          type="button"
        >
          Save Changes
        </button>
      </footer>
    </section>
  );
}
