import { AlertTriangle } from "lucide-react";
import type { Appointment } from "@/types/appointment";

type CancelConfirmationDialogProps = {
  appointment: Appointment;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelConfirmationDialog({
  appointment,
  onClose,
  onConfirm,
}: CancelConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        aria-label="Close cancellation confirmation"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="cancel-appointment-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        role="alertdialog"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle aria-hidden="true" size={21} />
        </span>
        <h2
          className="mt-4 text-lg font-semibold text-primary"
          id="cancel-appointment-title"
        >
          Cancel this appointment?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The appointment for{" "}
          <span className="font-medium text-text">
            {appointment.patientName}
          </span>{" "}
          ({appointment.id}) will be marked as cancelled.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="h-9 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
            onClick={onClose}
            type="button"
          >
            Keep appointment
          </button>
          <button
            className="h-9 rounded-md bg-rose-700 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-800"
            onClick={onConfirm}
            type="button"
          >
            Confirm cancellation
          </button>
        </div>
      </section>
    </div>
  );
}
