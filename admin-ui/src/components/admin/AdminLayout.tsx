"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Header } from "@/components/admin/Header";
import { Sidebar } from "@/components/admin/Sidebar";

type AdminLayoutSettings = {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
};

const AdminLayoutSettingsContext = createContext<AdminLayoutSettings | null>(null);

export function useAdminLayoutSettings() {
  const settings = useContext(AdminLayoutSettingsContext);
  if (!settings) {
    throw new Error("useAdminLayoutSettings must be used within AdminLayout.");
  }
  return settings;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <AdminLayoutSettingsContext.Provider
      value={{
        isSidebarCollapsed: isCollapsed,
        setSidebarCollapsed: setIsCollapsed,
      }}
    >
      <div className="min-h-screen md:flex">
        <div className="hidden md:block">
          <Sidebar
            isCollapsed={isCollapsed}
            isMobile={false}
            onNavigate={closeMobileMenu}
            onToggleCollapse={() => setIsCollapsed((collapsed) => !collapsed)}
          />
        </div>

        {isMobileMenuOpen && (
          <div
            aria-label="Main navigation"
            aria-modal="true"
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
          >
            <button
              aria-label="Close navigation menu"
              className="absolute inset-0 size-full cursor-default bg-primary/40"
              onClick={closeMobileMenu}
              type="button"
            />
            <div className="relative z-10 h-full w-[min(18rem,85vw)]">
              <Sidebar
                isCollapsed={false}
                isMobile
                onNavigate={closeMobileMenu}
                onToggleCollapse={() => undefined}
                onClose={closeMobileMenu}
              />
            </div>
          </div>
        )}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Header onOpenMenu={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-x-clip bg-background p-5 md:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminLayoutSettingsContext.Provider>
  );
}
