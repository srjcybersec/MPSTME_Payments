"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAllSessions } from "../../lib/api/auth";
import { useAppStore } from "../../store/app-store";
import { AppLogo } from "../brand/app-logo";

const links = [
  { href: "/vendor/queue", label: "Live Queue", icon: "Q" },
  { href: "/vendor/menu", label: "Menu", icon: "M" },
  { href: "/vendor/orders", label: "Orders", icon: "O" },
  { href: "/vendor/payments", label: "Payments", icon: "P" },
  { href: "/vendor/analytics", label: "Analytics", icon: "A" },
  { href: "/vendor/students", label: "Students", icon: "S" }
];

export function VendorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const token = useAppStore((s) => s.accessToken);
  const role = useAppStore((s) => s.role);
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const setRole = useAppStore((s) => s.setRole);
  const setUserId = useAppStore((s) => s.setUserId);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  useEffect(() => {
    setHydrated(useAppStore.persist.hasHydrated());
    const unsubscribe = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (role !== "VENDOR") {
      router.push("/home");
    }
  }, [hydrated, role, router, token]);

  async function onLogoutAll() {
    if (token) {
      try {
        await logoutAllSessions(token);
      } catch {
        // Best effort remote logout; always clear local session.
      }
    }
    setAccessToken(null);
    setRole(null);
    setUserId(null);
    setUserProfile(null, null);
    router.replace("/login");
  }

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-100 text-zinc-700">
        <p className="text-sm">Loading vendor workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [color-scheme:light]">
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-60 border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <AppLogo size={34} />
            <div>
              <p className="text-sm font-bold text-blue-700">MPSTME Canteen Pay</p>
              <p className="mt-1 text-xs text-slate-500">Vendor Desk</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                pathname === link.href
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                  pathname === link.href ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
          <button
            className="mt-4 flex w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            onClick={onLogoutAll}
            type="button"
          >
            Logout
          </button>
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:ml-60">
        <div className="flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <AppLogo size={30} className="lg:hidden" />
            <div>
            <h1 className="text-lg font-bold text-slate-900">Vendor Dashboard</h1>
            <p className="text-xs text-slate-500">Simple operations view</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 lg:flex">
              <span className="text-xs font-semibold text-blue-700">VENDOR</span>
            </div>
            <button
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 lg:hidden"
              onClick={onLogoutAll}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 lg:hidden">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="px-4 py-6 lg:ml-60 lg:px-8">{children}</main>
    </div>
  );
}
