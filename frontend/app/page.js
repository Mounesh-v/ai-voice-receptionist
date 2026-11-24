"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "./components/AuthProvider";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import AiReceptionistView from "./components/AiReceptionistView";
import BookAppointmentView from "./components/BookAppointmentView";
import MyAppointmentsView from "./components/MyAppointmentsView";
import ProfileView from "./components/ProfileView";
import HospitalInfoView from "./components/HospitalInfoView";
import { Menu, Bell } from "lucide-react";
import { apiRequest } from "../lib/api";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [doctorsMap, setDoctorsMap] = useState({});
  const [dataLoading, setDataLoading] = useState(false);

  // Fetch user appointments and doctors catalog
  const loadPortalData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [aptRes, docRes] = await Promise.all([
        apiRequest("/api/appointments/my"),
        apiRequest("/api/doctors"),
      ]);

      if (aptRes.ok) {
        const aptData = await aptRes.json();
        setAppointments(aptData?.appointments || []);
      }

      if (docRes.ok) {
        const docData = await docRes.json();
        const docs = docData?.doctors || [];
        const map = {};
        docs.forEach((doc) => {
          map[doc.doctor_id] = doc;
        });
        setDoctorsMap(map);
      }
    } catch (err) {
      console.error("Failed to load patient appointments or doctors:", err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      loadPortalData();
    }
  }, [loading, user, router, loadPortalData]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
          <p className="text-sm font-medium">Opening MediVoice Patient Portal...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-slate-900 capitalize">
                {activeTab === "dashboard"
                  ? "Patient Dashboard"
                  : activeTab === "receptionist"
                  ? "AI Voice Receptionist"
                  : activeTab === "book"
                  ? "Book Appointment"
                  : activeTab === "appointments"
                  ? "My Appointments"
                  : activeTab === "profile"
                  ? "My Profile"
                  : "Hospital Information"}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                City Care Hospital • Patient Self-Service Portal
              </p>
            </div>
          </div>

          {/* User Status / Notification Menu */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-blue-600" />
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 transition hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-28">
                  {user?.name || "Patient"}
                </p>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                  Patient
                </p>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {activeTab === "dashboard" && (
            <DashboardView
              user={user}
              onNavigate={(tab) => setActiveTab(tab)}
              appointments={appointments}
              doctorsMap={doctorsMap}
            />
          )}

          {activeTab === "receptionist" && (
            <AiReceptionistView
              user={user}
              onBookViaUi={() => setActiveTab("book")}
            />
          )}

          {activeTab === "book" && (
            <BookAppointmentView
              user={user}
              onBookingSuccess={() => {
                loadPortalData();
                setActiveTab("appointments");
              }}
            />
          )}

          {activeTab === "appointments" && (
            <MyAppointmentsView
              appointments={appointments}
              doctorsMap={doctorsMap}
              onRefresh={loadPortalData}
              onNavigateToBook={() => setActiveTab("book")}
            />
          )}

          {activeTab === "profile" && <ProfileView user={user} />}

          {activeTab === "hospital" && (
            <HospitalInfoView onNavigateToBook={() => setActiveTab("book")} />
          )}
        </main>
      </div>
    </div>
  );
}
