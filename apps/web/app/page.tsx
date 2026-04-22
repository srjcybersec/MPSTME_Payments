"use client";

import Link from "next/link";
import { AppLogo } from "../components/brand/app-logo";
import { useAppStore } from "../store/app-store";

export default function HomePage() {
  const token = useAppStore((s) => s.accessToken);
  const role = useAppStore((s) => s.role);

  const studentHref = token ? "/home" : "/login/student";
  const vendorHref = token ? (role === "VENDOR" ? "/vendor/queue" : "/home") : "/login/vendor";

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[18%] h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-[10%] top-[12%] h-52 w-52 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute bottom-[10%] left-[40%] h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <section className="grid w-full gap-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur md:grid-cols-[1.2fr_1fr] md:p-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-1">
            <AppLogo size={28} />
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">MPSTME Canteen Pay</p>
          </div>
          <h1 className="max-w-xl text-3xl font-bold leading-tight text-white md:text-4xl">
            Queue-free ordering with wallet-first checkout
          </h1>
          <p className="max-w-xl text-sm text-zinc-300 md:text-base">
            Fast student ordering, real-time queue handling, and seamless vendor operations in one platform.
          </p>
          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Student Experience</p>
              <p className="mt-1 text-zinc-300">Wallet top-up, menu browsing, and order tracking.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Vendor Desk</p>
              <p className="mt-1 text-zinc-300">Queue control, payments, analytics, and student ops.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
          <h2 className="text-lg font-semibold text-white">Get Started</h2>
          <p className="text-sm text-zinc-400">Choose your role to continue. Login credentials are prefilled on the next screen.</p>

          <div className="grid gap-3">
            <Link
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-95"
              href={studentHref}
            >
              Open Student App
            </Link>
            <Link
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-center text-sm font-semibold text-black transition hover:opacity-95"
              href={vendorHref}
            >
              Open Vendor Desk
            </Link>
          </div>

          <Link className="block pt-1 text-xs font-medium text-zinc-400 underline hover:text-zinc-200" href="/login">
            Choose login type manually
          </Link>
        </div>
      </section>
    </main>
  );
}
