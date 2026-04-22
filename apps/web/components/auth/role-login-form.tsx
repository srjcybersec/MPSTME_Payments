"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "../../lib/api/auth";
import { useAppStore } from "../../store/app-store";
import { AppLogo } from "../brand/app-logo";

type RoleLoginFormProps = {
  roleLabel: "Student" | "Vendor";
  title: string;
  description: string;
  defaultEmail: string;
  defaultPassword: string;
  alternateHref: string;
  alternateLabel: string;
};

export function RoleLoginForm({
  roleLabel,
  title,
  description,
  defaultEmail,
  defaultPassword,
  alternateHref,
  alternateLabel
}: RoleLoginFormProps) {
  const router = useRouter();
  const setAccessToken = useAppStore((s) => s.setAccessToken);
  const setRole = useAppStore((s) => s.setRole);
  const setUserId = useAppStore((s) => s.setUserId);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const data = await login(email, password);
      setAccessToken(data.accessToken);
      setRole(data.user.role);
      setUserId(data.user.id);
      setUserProfile(data.user.name, data.user.email);
      setMessage("Login successful. Redirecting...");
      router.push(data.user.role === "VENDOR" ? "/vendor/queue" : "/home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 md:px-6">
      <section className="grid w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-blue-700/40 via-indigo-700/20 to-zinc-900 p-8 md:flex">
          <div>
            <div className="flex items-center gap-3">
              <AppLogo size={34} />
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">MPSTME Canteen Pay</p>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white">{title}</h1>
            <p className="mt-3 max-w-sm text-sm text-zinc-300">{description}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300">Prefilled credentials</p>
            <p className="mt-2 text-sm text-zinc-200">{defaultEmail}</p>
            <p className="text-sm text-zinc-200">{defaultPassword}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6 md:p-8">
          <div>
            <div className="mb-2 flex items-center gap-2 md:hidden">
              <AppLogo size={28} />
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">MPSTME Canteen Pay</p>
            </div>
            <p className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
              {roleLabel} Login
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">Email</label>
              <input
                className="h-11 w-full rounded-lg border border-white/15 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="College email"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">Password</label>
              <input
                className="h-11 w-full rounded-lg border border-white/15 bg-zinc-950 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : `Login as ${roleLabel}`}
          </button>

          <div className="flex items-center justify-between">
            <Link className="text-xs text-zinc-400 underline" href="/">
              Back to Home
            </Link>
            <Link className="text-xs font-semibold text-blue-300 underline" href={alternateHref}>
              {alternateLabel}
            </Link>
          </div>

          {message ? (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.startsWith("Login successful")
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
