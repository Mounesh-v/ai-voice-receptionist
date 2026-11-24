"use client";

import { useState } from "react";
import { User, Mail, Phone, Calendar, Camera, CheckCircle } from "lucide-react";

export default function ProfileView({ user }) {
  const [name, setName] = useState(user?.name || "John Doe");
  const [email, setEmail] = useState(user?.email || "john.doe@email.com");
  const [phone, setPhone] = useState("9876543210");
  const [dob, setDob] = useState("1990-03-15");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
        <p className="mt-1 text-xs text-slate-500">
          View and edit your personal information, contact phone, and account settings.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-100 pb-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-3xl border-4 border-white shadow-md">
                {name ? name[0].toUpperCase() : "J"}
              </div>
              <button
                type="button"
                onClick={() => alert("Upload photo dialog")}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-bold text-slate-900 text-base">{name}</h3>
              <p className="text-xs text-slate-500">Patient ID: MED-449102</p>
              <button
                type="button"
                onClick={() => alert("Photo selector opened")}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Change Photo
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Full Name
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Phone Number
              </label>
              <div className="relative mt-1.5">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Date of Birth
              </label>
              <div className="relative mt-1.5">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Profile changes saved successfully!</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

