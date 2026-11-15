"use client";

import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { getPageTitle } from "@/lib/navigation";

type HeaderProps = {
  onOpenMenu: () => void;
};

export function Header({ onOpenMenu }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [searchText, setSearchText] = useState("");
  const [showSearchNotice, setShowSearchNotice] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="z-10 border-b border-border bg-card px-5 md:px-8">
      <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            aria-label="Open navigation menu"
            className="rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary md:hidden"
            onClick={onOpenMenu}
            type="button"
          >
            <Menu aria-hidden="true" size={21} />
          </button>
          <div className="min-w-0">
            <p className="mb-1 truncate text-xs text-slate-500">
              Home <span className="px-1 text-slate-300">/</span> {pageTitle}
            </p>
            <h1 className="truncate text-lg font-semibold leading-6 text-primary">
              {pageTitle}
            </h1>
          </div>
        </div>

        <label className="relative order-3 flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-slate-500 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15 md:order-none md:w-64">
          <Search aria-hidden="true" className="shrink-0" size={17} />
          <span className="sr-only">Workspace search, demo only</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-slate-400"
            aria-label="Workspace search (demo only)"
            onChange={(event) => {
              setSearchText(event.target.value);
              setShowSearchNotice(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchText.trim()) {
                setShowSearchNotice(true);
              }
            }}
            placeholder="Search (demo only)"
            type="search"
            value={searchText}
          />
          {showSearchNotice && (
            <span
              className="absolute left-0 top-full z-30 mt-2 w-72 rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 text-muted shadow-lg"
              role="status"
            >
              Workspace search is a demo control and is not connected to page data.
            </span>
          )}
        </label>

        <div className="ml-auto flex items-center gap-3 md:ml-0 md:gap-5">
          <div className="relative">
            <button
              aria-expanded={isNotificationsOpen}
              aria-haspopup="dialog"
              aria-label="Notifications (demo)"
              className="relative rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              type="button"
            >
              <Bell aria-hidden="true" size={20} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-secondary ring-2 ring-card" />
            </button>
            {isNotificationsOpen && (
              <div
                aria-label="Demo notifications"
                className="absolute right-0 top-full z-30 mt-2 w-72 rounded-md border border-border bg-card p-4 shadow-lg"
                role="dialog"
              >
                <p className="text-sm font-semibold text-primary">
                  Notifications
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Notification delivery is not connected. The indicator is sample UI only.
                </p>
                <button
                  className="mt-3 h-8 rounded-md border border-border px-3 text-xs font-medium text-text transition-colors hover:bg-background"
                  onClick={() => setIsNotificationsOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 border-l border-border pl-3 md:gap-3 md:pl-5">
            <div
              aria-label="Admin profile: Admin User"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-xs font-semibold text-secondary"
            >
              A
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium leading-5 text-primary">
                Admin User
              </p>
              <p className="truncate text-xs leading-4 text-slate-500">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
