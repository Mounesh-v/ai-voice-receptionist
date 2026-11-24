"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { apiRequest, parseApiError } from "../../lib/api";

export default function MyAppointmentsView({
  appointments = [],
  doctorsMap = {},
  onRefresh,
  onNavigateToBook,
}) {
  const [activeTab, setActiveTab] = useState("upcoming"); // "upcoming" | "history"
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("10:00");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Filter into Upcoming vs History
  const upcomingList = appointments.filter(
    (apt) => apt.status === "scheduled" && new Date(apt.appointment_start) >= new Date(Date.now() - 30 * 60 * 1000)
  );

  const historyList = appointments.filter(
    (apt) =>
      apt.status === "completed" ||
      apt.status === "cancelled" ||
      (apt.status === "scheduled" && new Date(apt.appointment_start) < new Date(Date.now() - 30 * 60 * 1000))
  );

  const displayedList = activeTab === "upcoming" ? upcomingList : historyList;

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

  const handleCancelAppointment = async (aptId) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    setActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await apiRequest(`/api/appointments/${aptId}/cancel`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res));
      }

      setActionFeedback({
        type: "success",
        text: "Appointment cancelled successfully.",
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionFeedback({
        type: "error",
        text: err.message || "Failed to cancel appointment.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;

    setActionLoading(true);
    setActionFeedback(null);

    try {
      const combinedStart = new Date(`${newDate}T${newTime}:00+05:30`);
      const res = await apiRequest(`/api/appointments/${rescheduleApt.appointment_id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          new_start: combinedStart.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res));
      }

      setActionFeedback({
        type: "success",
        text: "Appointment rescheduled successfully!",
      });
      setRescheduleApt(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionFeedback({
        type: "error",
        text: err.message || "Failed to reschedule appointment.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Appointments</h2>
          <p className="mt-1 text-xs text-slate-500">
            View upcoming consultations, check your history, reschedule or cancel visits.
          </p>
        </div>

        <button
          onClick={onNavigateToBook}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Calendar className="h-4 w-4" />
          <span>+ New Appointment</span>
        </button>
      </div>

      {/* Action feedback alert */}
      {actionFeedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
            activeTab === "upcoming"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Upcoming ({upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
            activeTab === "history"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          History ({historyList.length})
        </button>
      </div>

      {/* Appointments Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Doctor / Specialization</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedList.length > 0 ? (
                displayedList.map((apt) => {
                  const docInfo = doctorsMap[apt.doctor_id] || {};
                  const doctorName = docInfo.name || apt.doctor_id;
                  const department = apt.service || docInfo.specialization || "General Medicine";
                  const { dateStr, timeStr } = formatDateTime(apt.appointment_start);

                  return (
                    <tr key={apt.appointment_id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 border border-blue-100">
                            {doctorName[0]?.toUpperCase() || "D"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{doctorName}</p>
                            <p className="text-[11px] text-slate-500">{department}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800">{dateStr}</p>
                        <p className="text-[11px] text-slate-500">{timeStr}</p>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            apt.status === "scheduled"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : apt.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {apt.status === "scheduled" ? "Upcoming" : apt.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        {activeTab === "upcoming" ? (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                setRescheduleApt(apt);
                                const d = new Date(apt.appointment_start);
                                setNewDate(d.toISOString().split("T")[0]);
                              }}
                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-40"
                            >
                              Reschedule
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleCancelAppointment(apt.appointment_id)}
                              className="font-bold text-red-600 hover:text-red-800 hover:underline disabled:opacity-40"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-medium">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                    No {activeTab === "upcoming" ? "upcoming" : "past"} appointments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">
              Reschedule Appointment
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Select a new date and time for consultation.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  New Time
                </label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
