"use client";

import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Building2,
  Stethoscope,
  HeartPulse,
  UserCheck,
  ShieldAlert,
  Calendar,
} from "lucide-react";

export default function HospitalInfoView({ onNavigateToBook }) {
  const services = [
    {
      title: "General Medicine",
      desc: "Comprehensive routine physicals, preventive healthcare, and disease diagnosis.",
      icon: Stethoscope,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Cardiology",
      desc: "Advanced heart care, ECG diagnostics, and hypertension management.",
      icon: HeartPulse,
      color: "text-red-600 bg-red-50",
    },
    {
      title: "Dermatology",
      desc: "Specialized skin, hair, and cosmetic medical consultations.",
      icon: UserCheck,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Pediatrics",
      desc: "Gentle healthcare, vaccinations, and growth monitoring for children.",
      icon: Stethoscope,
      color: "text-amber-600 bg-amber-50",
    },
    {
      title: "Orthopedics",
      desc: "Joint, bone, fracture care, and rehabilitation therapies.",
      icon: Stethoscope,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Neurology",
      desc: "Specialized neurological diagnosis and stroke recovery care.",
      icon: Stethoscope,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Hospital Information</h2>
        <p className="mt-1 text-xs text-slate-500">
          General information, location, operating hours, and medical departments at City Care Hospital.
        </p>
      </div>

      {/* Main Hospital Contact & Location Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
        {/* Left Information Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                City Care Hospital
              </h3>
              <p className="text-xs font-semibold text-blue-600">
                NABH Accredited Multi-Speciality Medical Center
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            City Care Hospital provides compassionate, patient-centered healthcare
            powered by state-of-the-art diagnostic facilities and round-the-clock
            critical medical assistance.
          </p>

          <div className="space-y-3.5 border-t border-slate-100 pt-5 text-xs text-slate-700">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>123, Health Street, New York, USA - 10001</span>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-blue-600" />
              <a href="tel:+12345678900" className="hover:underline font-semibold">
                +1 234 567 8900
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-blue-600" />
              <a href="mailto:info@citycarehospital.com" className="hover:underline font-semibold">
                info@citycarehospital.com
              </a>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Working Hours:</p>
                <p className="text-slate-500 mt-0.5">Mon - Sat: 9:00 AM - 8:00 PM</p>
                <p className="text-slate-500">Sun: 10:00 AM - 2:00 PM</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onNavigateToBook}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4" />
              <span>Book Appointment at City Care</span>
            </button>
          </div>
        </div>

        {/* Right Building / Emergency Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-linear-to-b from-blue-900 to-slate-900 p-6 text-white shadow-md">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 border border-red-500/30">
              <ShieldAlert className="h-3.5 w-3.5" />
              24/7 Emergency Care
            </span>

            <h4 className="mt-4 text-xl font-bold">
              Immediate Medical Assistance
            </h4>
            <p className="mt-2 text-xs text-blue-200 leading-relaxed">
              Our emergency and trauma unit operates 24 hours a day with
              dedicated cardiologists, trauma surgeons, and ambulances on standby.
            </p>
          </div>

          <div className="mt-8 rounded-xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
            <p className="text-xs text-blue-200">Emergency Helpline</p>
            <p className="mt-1 font-mono text-xl font-bold text-white tracking-wider">
              1-800-CARE-911
            </p>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Our Services</h3>
          <p className="text-xs text-slate-500">
            Explore our clinical specialties and medical departments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${srv.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="mt-4 font-bold text-slate-900 text-sm">
                  {srv.title}
                </h4>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {srv.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

