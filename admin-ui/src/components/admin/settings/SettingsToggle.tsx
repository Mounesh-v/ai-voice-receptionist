export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && (
          <span className="mt-1 block text-xs leading-5 text-muted">
            {description}
          </span>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          aria-label={label}
          checked={checked}
          className="peer sr-only"
          onChange={(event) => onChange(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-secondary peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary"
        />
      </span>
    </label>
  );
}
