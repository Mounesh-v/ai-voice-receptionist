import type { ReactNode } from "react";

export function SettingsField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text">
        {label}
        {required && (
          <span aria-label="required" className="ml-1 text-rose-700">
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
