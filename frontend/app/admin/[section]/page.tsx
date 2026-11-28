import { Suspense } from "react";
import { notFound } from "next/navigation";
import { navigationItems, type NavigationItem } from "@/lib/navigation";

type AdminSectionPageProps = {
  params: Promise<{ section: string }>;
};

const adminSections = navigationItems.filter(
  (item) =>
    item.key !== "dashboard" &&
    item.key !== "appointments" &&
    item.key !== "doctors" &&
    item.key !== "patients" &&
    item.key !== "receptionist" &&
    item.key !== "knowledge",
);

export function generateStaticParams() {
  return adminSections.map((item) => ({
    section: item.href.slice("/admin/".length),
  }));
}

export default function AdminSectionPage({
  params,
}: AdminSectionPageProps) {
  return (
    <Suspense
      fallback={
        <section
          aria-label="Loading section"
          className="min-h-32 rounded-lg border border-border bg-card p-6 md:p-8"
        />
      }
    >
      <AdminSectionContent params={params} />
    </Suspense>
  );
}

async function AdminSectionContent({ params }: AdminSectionPageProps) {
  const { section } = await params;
  const path = `/admin/${section}`;
  const item: NavigationItem | undefined = adminSections.find(
    (navigationItem) => navigationItem.href === path,
  );

  if (!item) {
    notFound();
  }

  return (
    <section
      aria-label={`${item.label} section`}
      className="rounded-lg border border-border bg-card p-6 md:p-8"
    >
      <p className="text-sm font-medium text-secondary">Hospital Admin</p>
      <h2 className="mt-1 text-xl font-semibold text-primary">{item.label}</h2>
      <p className="mt-3 text-sm text-slate-500">
        {item.key === "logout"
          ? "Sign-out is unavailable in this frontend-only demo."
          : "This section will be available in a future step."}
      </p>
    </section>
  );
}
