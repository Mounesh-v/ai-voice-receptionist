"use client";

import {
  Mic,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  CalendarCheck,
  Stethoscope,
  HeartPulse,
  UserCheck,
} from "lucide-react";

export default function DashboardView({
  user,
  onNavigate,
  appointments = [],
  doctorsMap = {},
}) {
  const firstName = user?.name ? user.name.split(" ")[0] : "John";

  // Filter into Upcoming vs Previous from real appointments
  const upcomingList = appointments.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_start) >= new Date(Date.now() - 30 * 60 * 1000)
  );

  const previousList = appointments.filter(
    (apt) =>
      apt.status === "completed" ||
      apt.status === "cancelled" ||
      (apt.status === "scheduled" && new Date(apt.appointment_start) < new Date(Date.now() - 30 * 60 * 1000))
  );

  const formatDateTime = (isoString) => {
    try {
      const d = new Date(isoString);
      const dateStr = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: isoString, timeStr: "" };
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Patient Care Portal
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hello, {firstName} 👋
          </h1>
          <p className="mt-2 text-base text-blue-100 sm:text-lg">
            How can we help you today? Ask our AI voice receptionist or manage
            your hospital appointments below.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("receptionist")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 hover:shadow-lg"
            >
              <Mic className="h-4 w-4" />
              <span>Talk to AI Receptionist</span>
            </button>
            <button
              onClick={() => onNavigate("book")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <Calendar className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Quick Access AI Receptionist Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50/80 to-indigo-50/50 p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Mic className="h-7 w-7 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              AI Voice Receptionist Ready
            </h2>
            <p className="text-sm text-slate-600">
              Have questions about doctor schedules, departments, or need to book an appointment by voice?
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate("receptionist")}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
        >
          <span>Start Conversation</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Appointment Sections Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Upcoming Appointments</h3>
                <p className="text-xs text-slate-500">Your scheduled visits ({upcomingList.length})</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("appointments")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {upcomingList.length > 0 ? (
              upcomingList.slice(0, 3).map((apt) => {
                const doc = doctorsMap[apt.doctor_id] || {};
                const doctorName = doc.name || apt.doctor_id;
                const department = apt.service || doc.specialization || "General Medicine";
                const { dateStr, timeStr } = formatDateTime(apt.appointment_start);

                return (
                  <div
                    key={apt.appointment_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {doctorName[0]?.toUpperCase() || "D"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                          {department}
                        </p>
                        <h4 className="font-bold text-slate-900">{doctorName}</h4>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {dateStr} • {timeStr}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigate("appointments")}
                        className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No upcoming appointments scheduled
                </p>
                <button
                  onClick={() => onNavigate("book")}
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                >
                  + Book an Appointment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Previous Appointments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Previous Appointments</h3>
                <p className="text-xs text-slate-500">Past consultation history ({previousList.length})</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("appointments")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {previousList.length > 0 ? (
              previousList.slice(0, 3).map((apt) => {
                const doc = doctorsMap[apt.doctor_id] || {};
                const doctorName = doc.name || apt.doctor_id;
                const department = apt.service || doc.specialization || "General Medicine";
                const { dateStr, timeStr } = formatDateTime(apt.appointment_start);

                return (
                  <div
                    key={apt.appointment_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
                        {doctorName[0]?.toUpperCase() || "D"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {department}
                        </p>
                        <h4 className="font-bold text-slate-900">{doctorName}</h4>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {dateStr} • {timeStr}
                          </span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                        apt.status === "cancelled"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                      }`}
                    >
                      {apt.status === "cancelled" ? "Cancelled" : "Completed"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                No past appointment history found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hospital Departments Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="font-bold text-slate-900">Hospital Departments</h3>
        <p className="text-xs text-slate-500">Specialized medical care at City Care Hospital</p>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { name: "General Medicine", icon: Stethoscope, color: "text-blue-600", bg: "bg-blue-50" },
            { name: "Cardiology", icon: HeartPulse, color: "text-red-600", bg: "bg-red-50" },
            { name: "Dermatology", icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50" },
            { name: "Pediatrics", icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50" },
            { name: "Orthopedics", icon: Stethoscope, color: "text-emerald-600", bg: "bg-emerald-50" },
            { name: "Neurology", icon: Stethoscope, color: "text-indigo-600", bg: "bg-indigo-50" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onNavigate("book")}
                className="flex flex-col items-center rounded-xl border border-slate-100 p-4 text-center transition hover:border-blue-300 hover:shadow-xs group"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-800">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
