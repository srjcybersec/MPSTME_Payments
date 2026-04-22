 "use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getSessions, removeSession } from "../../../lib/api/auth";
import { useAppStore } from "../../../store/app-store";

export default function StudentProfilePage() {
  const pushNotificationsEnabled = useAppStore((s) => s.pushNotificationsEnabled);
  const setPushNotificationsEnabled = useAppStore((s) => s.setPushNotificationsEnabled);
  const { data, refetch } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: getSessions
  });
  const removeSessionMutation = useMutation({
    mutationFn: removeSession,
    onSuccess: () => {
      void refetch();
    }
  });

  return (
    <section className="space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Profile & Security</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage app preferences and active sessions.</p>
      </div>

      <div className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-zinc-300">
        <div className="flex items-center justify-between">
          <p>Push notifications</p>
          <button
            className={`interactive-btn rounded-lg px-3 py-1.5 text-xs font-semibold ${
              pushNotificationsEnabled ? "bg-emerald-500/20 text-emerald-200" : "bg-zinc-700 text-zinc-300"
            }`}
            onClick={() => setPushNotificationsEnabled(!pushNotificationsEnabled)}
            type="button"
          >
            {pushNotificationsEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="interactive-card rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <p className="mb-2 text-sm font-semibold text-zinc-100">Active Sessions</p>
        <div className="space-y-2">
          {data?.map((session) => (
            <div key={session.id} className="interactive-card flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/70 p-3">
              <div>
                <p className="text-xs text-zinc-300">{session.userAgent ?? "Unknown Device"}</p>
                <p className="text-xs text-zinc-500">{new Date(session.lastSeenAt).toLocaleString()}</p>
              </div>
              <button
                className="interactive-btn rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 disabled:opacity-50"
                disabled={removeSessionMutation.isPending}
                onClick={() => removeSessionMutation.mutate(session.id)}
                type="button"
              >
                {removeSessionMutation.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
          {!data?.length ? <p className="text-xs text-zinc-500">No active sessions found.</p> : null}
        </div>
      </div>
    </section>
  );
}
