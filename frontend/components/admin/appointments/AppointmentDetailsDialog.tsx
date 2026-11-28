import { X } from "lucide-react";
import type { Appointment } from "@/types/appointment";

type AppointmentDetailsDialogProps = {
  appointment: Appointment;
  onClose: () => void;
};

export function AppointmentDetailsDialog({
  appointment,
  onClose,
}: AppointmentDetailsDialogProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close appointment details"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="appointment-details-title"
        aria-modal="true"
        className="relative z-10 my-auto w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {appointment.id}
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-primary"
              id="appointment-details-title"
            >
              Appointment details
            </h2>
          </div>
          <button
            aria-label="Close appointment details"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Patient name" value={appointment.patientName} />
          <Detail label="Patient ID" value={appointment.patientId} />
          <Detail label="Doctor" value={appointment.doctorName} />
          <Detail label="Department" value={appointment.department} />
          <Detail label="Date" value={appointment.date} />
          <Detail label="Time" value={appointment.time} />
          <Detail label="Appointment type" value={appointment.appointmentType} />
          <Detail label="Status" value={appointment.status} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted">Reason for visit</dt>
            <dd className="mt-1 text-sm text-text">{appointment.reason}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-text">{value}</dd>
    </div>
  );
}
