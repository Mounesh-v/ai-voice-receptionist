"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  doctorDepartments,
  initialDoctors,
  weekdays,
} from "@/data/doctors";
import type {
  Doctor,
  DoctorAvailability,
  DoctorFormValues,
  DoctorSchedule,
  Weekday,
} from "@/types/doctor";

type DoctorFormDialogProps = {
  doctor?: Doctor;
  initialId?: string;
  onClose: () => void;
  onSave: (values: DoctorFormValues, photoFile?: File) => string | undefined;
};

const blankDoctor: DoctorFormValues = {
  id: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  specialization: "",
  qualification: "",
  experienceYears: 0,
  consultationFee: 0,
  availability: "Available",
  location: "",
  languages: [],
  bio: "",
  schedule: initialDoctors[0].schedule,
};

export function DoctorFormDialog({
  doctor,
  initialId,
  onClose,
  onSave,
}: DoctorFormDialogProps) {
  const [values, setValues] = useState<DoctorFormValues>(() =>
    doctor
      ? {
          ...doctor,
          languages: [...doctor.languages],
          schedule: { ...doctor.schedule },
        }
      : {
          ...blankDoctor,
          id: initialId ?? "",
          schedule: { ...blankDoctor.schedule },
        },
  );
  const firstWorkingDay =
    weekdays.find((day) => values.schedule[day].enabled) ?? weekdays[0];
  const [workingDays, setWorkingDays] = useState<Weekday[]>(() =>
    weekdays.filter((day) => values.schedule[day].enabled),
  );
  const [startTime, setStartTime] = useState(
    values.schedule[firstWorkingDay].start,
  );
  const [endTime, setEndTime] = useState(
    values.schedule[firstWorkingDay].end,
  );
  const [photoFile, setPhotoFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const update = <Key extends keyof DoctorFormValues>(
    key: Key,
    value: DoctorFormValues[Key],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const updateWorkingDays = (day: Weekday, checked: boolean) => {
    const nextWorkingDays = checked
      ? [...workingDays, day]
      : workingDays.filter((workingDay) => workingDay !== day);
    setWorkingDays(nextWorkingDays);
    setValues((current) => ({
      ...current,
      schedule: Object.fromEntries(
        weekdays.map((weekday) => [
          weekday,
          {
            ...current.schedule[weekday],
            enabled: nextWorkingDays.includes(weekday),
          },
        ]),
      ) as DoctorSchedule,
    }));
  };

  const updateScheduleTime = (field: "start" | "end", value: string) => {
    if (field === "start") setStartTime(value);
    else setEndTime(value);
    setValues((current) => ({
      ...current,
      schedule: Object.fromEntries(
        weekdays.map((day) => [
          day,
          workingDays.includes(day)
            ? { ...current.schedule[day], [field]: value }
            : current.schedule[day],
        ]),
      ) as DoctorSchedule,
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workingDays.length) {
      setError("Select at least one working day.");
      return;
    }
    if (startTime >= endTime) {
      setError("The end time must be later than the start time.");
      return;
    }
    if (
      !values.name.trim() ||
      !values.id.trim() ||
      !values.email.trim() ||
      !values.phone.trim() ||
      !values.department ||
      !values.specialization.trim() ||
      !values.qualification.trim()
    ) {
      setError("Complete all required fields before saving.");
      return;
    }
    const saveError = onSave(
      {
        ...values,
        id: values.id.trim().toUpperCase(),
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        specialization: values.specialization.trim(),
        qualification: values.qualification.trim(),
        location: values.location.trim(),
        bio: values.bio.trim(),
      },
      photoFile,
    );
    if (saveError) setError(saveError);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close doctor form"
        className="fixed inset-0 bg-primary/40"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="doctor-form-title"
        aria-modal="true"
        className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl"
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-secondary">
              {doctor ? doctor.id : "New profile"}
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-primary"
              id="doctor-form-title"
            >
              {doctor ? "Edit doctor" : "Add doctor"}
            </h2>
          </div>
          <button
            aria-label="Close doctor form"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              onChange={(value) => update("name", value)}
              required
              value={values.name}
            />
            <Field
              label="Doctor ID"
              onChange={(value) => update("id", value)}
              required
              value={values.id}
            />
            <Field
              label="Email"
              onChange={(value) => update("email", value)}
              required
              type="email"
              value={values.email}
            />
            <Field
              label="Phone"
              onChange={(value) => update("phone", value)}
              required
              type="tel"
              value={values.phone}
            />
            <SelectField
              label="Department"
              onChange={(value) => update("department", value)}
              options={doctorDepartments}
              required
              value={values.department}
            />
            <Field
              label="Specialization"
              onChange={(value) => update("specialization", value)}
              required
              value={values.specialization}
            />
            <Field
              label="Qualification"
              onChange={(value) => update("qualification", value)}
              required
              value={values.qualification}
            />
            <Field
              label="Years of experience"
              min="0"
              onChange={(value) =>
                update("experienceYears", Math.max(0, Number(value) || 0))
              }
              type="number"
              value={String(values.experienceYears)}
            />
            <Field
              label="Consultation fee ($)"
              min="0"
              onChange={(value) =>
                update("consultationFee", Math.max(0, Number(value) || 0))
              }
              type="number"
              value={String(values.consultationFee)}
            />
            <label>
              <span className="mb-1.5 block text-sm font-medium text-text">
                Availability
              </span>
              <select
                className={fieldClass}
                onChange={(event) =>
                  update(
                    "availability",
                    event.target.value as DoctorAvailability,
                  )
                }
                value={values.availability}
              >
                <option>Available</option>
                <option>On Leave</option>
                <option>Unavailable</option>
              </select>
            </label>
            <Field
              label="Clinic / location"
              onChange={(value) => update("location", value)}
              value={values.location}
            />
            <Field
              label="Languages (comma-separated)"
              onChange={(value) =>
                update(
                  "languages",
                  value
                    .split(",")
                    .map((language) => language.trim())
                    .filter(Boolean),
                )
              }
              value={values.languages.join(", ")}
            />
          </div>

          <fieldset className="rounded-md border border-border p-4">
            <legend className="px-1 text-sm font-medium text-text">
              Working days and consultation hours
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weekdays.map((day) => (
                <label
                  className="flex items-center gap-2 text-sm text-text"
                  key={day}
                >
                  <input
                    checked={workingDays.includes(day)}
                    className="size-4 accent-secondary"
                    onChange={(event) =>
                      updateWorkingDays(day, event.target.checked)
                    }
                    type="checkbox"
                  />
                  {day}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Start time"
                onChange={(value) => updateScheduleTime("start", value)}
                required
                type="time"
                value={startTime}
              />
              <Field
                label="End time"
                min={startTime}
                onChange={(value) => updateScheduleTime("end", value)}
                required
                type="time"
                value={endTime}
              />
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">
              Profile summary
            </span>
            <textarea
              className={`${fieldClass} min-h-20 resize-y py-2`}
              onChange={(event) => update("bio", event.target.value)}
              value={values.bio}
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-text">
              Profile photo
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-background text-muted">
                {previewUrl || doctor?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Doctor profile preview"
                    className="size-full object-cover"
                    src={previewUrl || doctor?.photoUrl}
                  />
                ) : (
                  <ImagePlus aria-hidden="true" size={22} />
                )}
              </div>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-sm font-medium text-text transition-colors hover:bg-background">
                Choose image
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPhotoFile(file);
                    setPreviewUrl(file ? URL.createObjectURL(file) : undefined);
                  }}
                  type="file"
                />
              </label>
              <span className="text-xs text-muted">
                JPG, PNG, or another supported image
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              className="h-10 rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-background"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-md bg-secondary px-4 text-sm font-medium text-white transition-colors hover:bg-secondary/90"
              type="submit"
            >
              {doctor ? "Save changes" : "Add doctor"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const fieldClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15";

function Field({
  label,
  onChange,
  required = false,
  type = "text",
  value,
  min,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number" | "time";
  value: string;
  min?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </span>
      <input
        className={fieldClass}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  value: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-text">
        {label}
      </span>
      <select
        className={fieldClass}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option disabled value="">
          Select a department
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
