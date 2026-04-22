import Link from "next/link";
import { AppLogo } from "../../../components/brand/app-logo";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8 md:px-6">
      <section className="w-full rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl md:p-8">
        <div className="flex items-center gap-3">
          <AppLogo size={34} />
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">MPSTME Canteen Pay</p>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-white">Choose login type</h1>
        <p className="mt-2 text-sm text-zinc-400">Pick the role you want to access. Credentials are prefilled on the next screen.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/login/student"
            className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-5 transition hover:border-blue-400/60 hover:bg-blue-500/20"
          >
            <p className="text-sm font-semibold text-blue-200">Student Login</p>
            <p className="mt-1 text-sm text-zinc-300">For placing orders, wallet, and order tracking.</p>
          </Link>

          <Link
            href="/login/vendor"
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 transition hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            <p className="text-sm font-semibold text-amber-200">Vendor Login</p>
            <p className="mt-1 text-sm text-zinc-300">For queue operations, menu, students, and analytics.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
