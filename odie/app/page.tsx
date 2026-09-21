import { CommandBox } from "./CommandBox";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export default async function HomePage() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    profiles,
    habits,
    verifications,
    pendingApprovals,
    recentRuns,
    recentTasks,
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("habits")
      .select("*", { count: "exact", head: true })
      .is("archived_at", null),
    admin
      .from("habit_verifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    admin
      .from("odie_approvals")
      .select("id, action, summary, requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    admin
      .from("odie_agent_runs")
      .select("agent, started_at, status, summary")
      .order("started_at", { ascending: false })
      .limit(6),
    admin
      .from("odie_tasks")
      .select("id, description, agent, status, created_at")
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <main className="screen">
      <div className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Odie
        </div>
        <form action={signOut}>
          <button type="submit" className="pill" style={{ border: "none" }}>
            Sign out
          </button>
        </form>
      </div>

      <div className="card">
        <p className="card-title">Piton status</p>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{profiles.count ?? 0}</div>
            <div className="stat-label">Profiles</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{habits.count ?? 0}</div>
            <div className="stat-label">Active habits</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{verifications.count ?? 0}</div>
            <div className="stat-label">Verifications (7d)</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">
              {pendingApprovals.data?.length ?? 0}
            </div>
            <div className="stat-label">Pending approvals</div>
          </div>
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 12,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          Piton hasn&apos;t launched publicly — these are internal/test numbers,
          not production metrics.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Backend</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">
            <span className="pill-dot ok" /> ai-coach
          </span>
          <span className="pill">
            <span className="pill-dot ok" /> verify-image
          </span>
        </div>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 12,
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          Snapshot from the last manual check, not a live poll — Edge Function
          live-status needs a Supabase management token Odie doesn&apos;t have
          yet.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Approvals needing you</p>
        {pendingApprovals.data && pendingApprovals.data.length > 0 ? (
          pendingApprovals.data.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <div className="list-row-title">{a.action}</div>
                <div className="list-row-meta">{a.summary}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">Nothing waiting on you.</p>
        )}
      </div>

      <div className="card">
        <p className="card-title">Open tasks</p>
        {recentTasks.data && recentTasks.data.length > 0 ? (
          recentTasks.data.map((t) => (
            <div className="list-row" key={t.id}>
              <div className="list-row-title">{t.description}</div>
              <div className="list-row-meta">
                {t.agent} · {t.status}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">No open tasks. Ask Odie to create one.</p>
        )}
      </div>

      <div className="card">
        <p className="card-title">Recent agent runs</p>
        {recentRuns.data && recentRuns.data.length > 0 ? (
          recentRuns.data.map((r, i) => (
            <div className="list-row" key={`${r.agent}-${i}`}>
              <div className="list-row-title">{r.agent}</div>
              <div className="list-row-meta">
                {new Date(r.started_at).toLocaleDateString()} · {r.status}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">
            No runs recorded yet — the weekly GitHub Actions job writes here
            once it runs, or ask Odie to trigger one.
          </p>
        )}
      </div>

      <CommandBox />
    </main>
  );
}
