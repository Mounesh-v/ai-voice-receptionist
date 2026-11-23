"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./components/AuthProvider";
import VoiceRecorder from "./components/VoiceRecorder";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Checking your session...
      </div>
    );
  }

  return (
    <main>
      <VoiceRecorder />
    </main>
  );
}
