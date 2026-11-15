"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Headset,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  isPathActive,
  navigationItems,
  type NavigationKey,
} from "@/lib/navigation";

const icons = {
  dashboard: LayoutDashboard,
  appointments: CalendarDays,
  doctors: Stethoscope,
  patients: UsersRound,
  receptionist: Headset,
  knowledge: BookOpen,
  reports: ChartNoAxesCombined,
  settings: Settings,
  logout: LogOut,
} satisfies Record<NavigationKey, typeof LayoutDashboard>;

type SidebarProps = {
  isCollapsed: boolean;
  isMobile: boolean;
  onNavigate: () => void;
  onToggleCollapse: () => void;
  onClose?: () => void;
};

export function Sidebar({
  isCollapsed,
  isMobile,
  onNavigate,
  onToggleCollapse,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const showLabels = isMobile || !isCollapsed;
  const mainItems = navigationItems.filter((item) => item.key !== "logout");
  const logoutItem = navigationItems.find((item) => item.key === "logout");

  const renderItem = (item: (typeof navigationItems)[number]) => {
    const Icon = icons[item.key];
    const active = isPathActive(pathname, item.href);

    return (
      <Link
        key={item.key}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 text-sm transition-colors ${
          active
            ? "border-secondary bg-white/10 font-medium text-white"
            : "border-transparent text-slate-300 hover:bg-white/8 hover:text-white"
        } ${showLabels ? "" : "justify-center px-0"}`}
        href={item.href}
        onClick={onNavigate}
        title={showLabels ? undefined : item.label}
      >
        <Icon aria-hidden="true" className="shrink-0" size={19} />
        <span className={showLabels ? "truncate" : "sr-only"}>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      aria-label="Hospital administration"
      className={`flex h-screen flex-col bg-primary text-white ${
        isMobile ? "w-full" : isCollapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-white/10 ${
          showLabels ? "gap-3 px-5" : "justify-center px-2"
        }`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-white">
          <Plus aria-hidden="true" size={22} strokeWidth={2.5} />
        </span>
        {showLabels && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-wide">
              AI Hospital
            </span>
            <span className="mt-0.5 block text-xs text-slate-300">
              Practice Management
            </span>
          </span>
        )}
        {isMobile && onClose && (
          <button
            aria-label="Close navigation menu"
            className="ml-auto rounded-md p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">{mainItems.map(renderItem)}</ul>
        <div className="my-4 border-t border-white/10" />
        {logoutItem && renderItem(logoutItem)}
      </nav>

      {!isMobile && (
        <div className="border-t border-white/10 p-3">
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            className={`flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            onClick={onToggleCollapse}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight aria-hidden="true" size={19} />
            ) : (
              <>
                <ChevronLeft aria-hidden="true" size={19} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
