"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiRequest, parseApiError } from "../../lib/api";

export default function BookAppointmentView({ user, onBookingSuccess }) {
  const departments = [
    "General Physician",
    "Cardiology",
    "Dermatology",
    "Pediatrics",
    "Orthopedics",
    "Neurology",
  ];

  const [selectedDept, setSelectedDept] = useState("General Physician");
  const [allDoctors, setAllDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Default to tomorrow or today
    return today.toISOString().split("T")[0];
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [bookedDetails, setBookedDetails] = useState(null);

  // 1. Load all doctors on mount
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await apiRequest("/api/doctors");
        if (res.ok) {
          const data = await res.json();
          const list = data?.doctors || [];
          setAllDoctors(list);
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      }
    }
    fetchDoctors();
  }, []);

  // 2. Filter doctors when selected department changes
  useEffect(() => {
    const matches = allDoctors.filter(
      (d) =>
        d.specialization?.toLowerCase() === selectedDept.toLowerCase() ||
        (selectedDept === "General Physician" && d.specialization?.toLowerCase().includes("general"))
    );
    const docs = matches.length > 0 ? matches : allDoctors;
    setFilteredDoctors(docs);

    if (docs.length > 0) {
      setSelectedDoctorId(docs[0].doctor_id);
    } else {
      setSelectedDoctorId("");
    }
  }, [selectedDept, allDoctors]);

  // 3. Fetch availability slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    async function fetchAvailability() {
      setLoadingSlots(true);
      setErrorMessage("");
      try {
        const res = await apiRequest(
          `/api/appointments/availability?doctor_id=${encodeURIComponent(
            selectedDoctorId
          )}&appointment_date=${selectedDate}&timezone_offset=%2B05:30`
        );

        if (res.ok) {
          const data = await res.json();
          const slots = data?.slots || [];
          setAvailableSlots(slots);

          // Select first available slot
          const firstAvailable = slots.find((s) => s.available);
          if (firstAvailable) {
            setSelectedSlotTime(firstAvailable.start);
          } else {
            setSelectedSlotTime("");
          }
        } else {
          // Generate fallback default working slots for UI
          generateFallbackSlots();
        }
      } catch {
        generateFallbackSlots();
      } finally {
        setLoadingSlots(false);
      }
    }

    function generateFallbackSlots() {
      const times = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
      ];
      const fallback = times.map((t) => {
        const startIso = `${selectedDate}T${t}:00+05:30`;
        return { start: startIso, available: true };
      });
      setAvailableSlots(fallback);
      setSelectedSlotTime(fallback[2]?.start || fallback[0]?.start);
    }

    fetchAvailability();
  }, [selectedDoctorId, selectedDate]);

  // Format ISO start time to readable display "10:00 AM"
  const formatSlotLabel = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setErrorMessage("Please select a doctor.");
      return;
    }
    if (!selectedSlotTime) {
      setErrorMessage("Please select an available time slot.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const currentDoc = allDoctors.find((d) => d.doctor_id === selectedDoctorId);
    const doctorName = currentDoc ? currentDoc.name : "Hospital Physician";

    try {
      const res = await apiRequest("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          service: selectedDept,
          appointment_start: new Date(selectedSlotTime).toISOString(),
          reason: reason || `Consultation with ${doctorName}`,
        }),
      });

      if (!res.ok) {
        const errText = await parseApiError(res);
        throw new Error(errText);
      }

      const data = await res.json();
      setBookedDetails({
        id: data.appointment_id || "APT-" + Math.floor(1000 + Math.random() * 9000),
        doctor: doctorName,
        department: selectedDept,
        date: selectedDate,
        time: formatSlotLabel(selectedSlotTime),
      });

      if (onBookingSuccess) {
        onBookingSuccess();
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Book Appointment</h2>
        <p className="mt-1 text-xs text-slate-500">
          Select department, choose a specialized physician, and pick your preferred time slot.
        </p>
      </div>

      {bookedDetails ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">
            Booking Confirmed!
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Your appointment has been registered with City Care Hospital.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-xl bg-white p-5 text-left border border-emerald-100 shadow-xs space-y-2.5">
            <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500">Booking ID</span>
              <span className="font-bold text-slate-800">{bookedDetails.id}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500">Physician</span>
              <span className="font-bold text-slate-800">{bookedDetails.doctor}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500">Department</span>
              <span className="font-bold text-slate-800">{bookedDetails.department}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Scheduled For</span>
              <span className="font-bold text-blue-600">
                {bookedDetails.date} at {bookedDetails.time}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setBookedDetails(null);
                setReason("");
              }}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleBooking}
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs"
        >
          {/* Left Fields */}
          <div className="lg:col-span-6 space-y-5">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Department
              </label>
              <div className="relative mt-1.5">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Doctor
              </label>
              <div className="relative mt-1.5">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                >
                  {filteredDoctors.map((doc) => (
                    <option key={doc.doctor_id} value={doc.doctor_id}>
                      {doc.name} {doc.specialization ? `(${doc.specialization})` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Date
              </label>
              <div className="relative mt-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Reason / Symptoms (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for visit..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Right Slots Grid */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Available Time Slots
                </label>
                {loadingSlots && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking slots...
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Choose one available slot for {selectedDate}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => {
                    const isSelected = selectedSlotTime === slot.start;
                    const label = formatSlotLabel(slot.start);
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlotTime(slot.start)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                          !slot.available
                            ? "border-slate-100 bg-slate-100/60 text-slate-400 cursor-not-allowed"
                            : isSelected
                            ? "border-teal-600 bg-teal-600 text-white shadow-xs shadow-teal-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/40"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 py-8 text-center text-xs text-slate-400">
                    No available time slots on this date.
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Confirm Booking Button */}
            <button
              type="submit"
              disabled={submitting || !selectedSlotTime}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Reserving Appointment...</span>
                </>
              ) : (
                <span>Confirm Booking</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
