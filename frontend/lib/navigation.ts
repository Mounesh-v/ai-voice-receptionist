export type NavigationKey =
  | "dashboard"
  | "appointments"
  | "doctors"
  | "patients"
  | "receptionist"
  | "knowledge"
  | "logout";

export type NavigationItem = {
  key: NavigationKey;
  label: string;
  href: string;
};

export const navigationItems: NavigationItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
  { key: "appointments", label: "Appointments", href: "/admin/appointments" },
  { key: "doctors", label: "Doctors", href: "/admin/doctors" },
  { key: "patients", label: "Patients", href: "/admin/patients" },
  {
    key: "receptionist",
    label: "AI Receptionist",
    href: "/admin/ai-receptionist",
  },
  {
    key: "knowledge",
    label: "Knowledge Base",
    href: "/admin/knowledge-base",
  },
  { key: "logout", label: "Logout", href: "/admin/logout" },
];

export function isPathActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getPageTitle(
  pathname: string,
  items: NavigationItem[] = navigationItems,
): string {
  return (
    items.find((item) => item.key !== "logout" && isPathActive(pathname, item.href))
      ?.label ?? "Dashboard"
  );
}
