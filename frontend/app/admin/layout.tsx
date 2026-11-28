"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/app/components/AuthProvider";

export default function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== "admin") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Checking your session...
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}
