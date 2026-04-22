"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { logoutAllSessions } from "../../lib/api/auth";
import { useAppStore } from "../../store/app-store";
import { AppLogo } from "../brand/app-logo";

const tabs = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/menu", label: "Menu", icon: "restaurant_menu" },
  { href: "/orders", label: "Orders", icon: "receipt_long" },
  { href: "/wallet", label: "Wallet", icon: "account_balance_wallet" }
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppStore((s) => s.accessToken);
  const role = useAppStore((s) => s.role);
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const setRole = useAppStore((s) => s.setRole);
  const setUserId = useAppStore((s) => s.setUserId);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    if (role && role !== "STUDENT") {
      router.push("/vendor/queue");
    }
  }, [role, router, token]);

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

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-950 text-zinc-100 [color-scheme:dark]">
      <header className="fixed left-0 right-0 top-0 z-40 mx-auto flex h-16 w-full max-w-md items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AppLogo size={34} className="animate-[softFloat_4s_ease-in-out_infinite]" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Student App</p>
            <p className="text-sm font-semibold text-indigo-300">MPSTME Canteen Pay</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="interactive-btn rounded-lg border border-white/10 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/5"
          >
            Profile
          </Link>
          <button
            className="interactive-btn rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
            onClick={onLogoutAll}
            type="button"
          >
            Logout all
          </button>
        </div>
      </header>
      <main className="pb-28 pt-16">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex w-full max-w-md justify-around rounded-t-2xl border-t border-white/10 bg-slate-900/80 p-3 pb-5 backdrop-blur-xl">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="group">
            {(() => {
              const isActive = pathname === tab.href || (tab.href !== "/home" && pathname.startsWith(`${tab.href}/`));
              return (
                <span
                  className={`interactive-btn flex min-w-14 flex-col items-center rounded-xl px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                    isActive ? "bg-indigo-500/10 text-indigo-300" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                  <span
                    className={`mt-1 h-1 w-1 rounded-full ${
                      isActive ? "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.9)]" : "bg-transparent"
                    }`}
                  />
                </span>
              );
            })()}
          </Link>
        ))}        
      </nav>
    </div>
  );
}
