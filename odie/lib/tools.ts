import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The real, currently-wired tool surface for Odie's command router.
 *
 * Every tool here does something against actual data — real Supabase
 * tables, or a clearly-labeled "not configured" response when the
 * integration it needs (a GitHub token, for now) isn't set up yet. Nothing
 * in this file returns invented numbers. Add a tool only once the thing it
 * describes is real.
 */
export const TOOL_DEFINITIONS = [
  {
    name: "get_piton_status",
    description:
      "Real, current counts from the Piton production database: total profiles, active habits, and habit verifications in the last 7 days, plus pending Odie approvals and the 5 most recent agent runs. Piton has not launched publicly yet, so these are internal/test numbers, not growth metrics — say so plainly if asked to interpret them.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_recent_agent_runs",
    description:
      "List the most recent runs of Piton's automation agents (product-manager, review-management, growth, content-creation, aso, analytics) from odie_agent_runs.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max rows to return, default 10",
        },
        agent: {
          type: "string",
          description: "Filter to one agent's runs, optional",
        },
      },
      required: [],
    },
  },
  {
    name: "list_tasks",
    description: "List Odie tasks, optionally filtered by status.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "queued",
            "planning",
            "running",
            "waiting",
            "approval_required",
            "completed",
            "failed",
            "cancelled",
          ],
        },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description:
      "Create a new tracked Odie task. Use this to record work that should happen, even if nothing executes it automatically yet in this phase — it makes the work visible and trackable instead of only living in this conversation.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string" },
        agent: {
          type: "string",
          description:
            "Which agent/area this belongs to, e.g. product, coding, qa, analytics, content, devops",
        },
        priority: {
          type: "number",
          description: "1 (highest) to 5 (lowest), default 3",
        },
      },
      required: ["description", "agent"],
    },
  },
  {
    name: "list_approvals",
    description: "List Odie approval requests, optionally filtered by status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "approved", "rejected"] },
      },
      required: [],
    },
  },
  {
    name: "create_approval",
    description:
      "Flag an action as needing the owner's explicit approval before it happens (production release, destructive data change, pricing change, publishing content, etc.) — per Odie's automation-level rules, never perform this class of action directly.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Related task ID, optional" },
        action: { type: "string" },
        summary: { type: "string" },
      },
      required: ["action", "summary"],
    },
  },
  {
    name: "decide_approval",
    description:
      "Record the owner's approve/reject decision on a pending approval.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        decision: { type: "string", enum: ["approved", "rejected"] },
      },
      required: ["id", "decision"],
    },
  },
  {
    name: "get_agent_run_report",
    description:
      "Fetch the full generated report for one agent run — e.g. the actual scripts/captions/hashtags/image-video prompts from a content-creation-agent run, not just its summary. Pass either run_id (from list_recent_agent_runs) or agent (to get that agent's most recent run).",
    input_schema: {
      type: "object",
      properties: {
        run_id: { type: "string" },
        agent: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "trigger_agent",
    description:
      "Dispatch one of Piton's real automation agents (product-manager, review-management, growth, content-creation, aso, analytics) to run now via its GitHub Actions workflow, instead of waiting for the weekly cron. Requires GITHUB_DISPATCH_TOKEN to be configured — if it isn't, say so plainly rather than claiming the agent ran.",
    input_schema: {
      type: "object",
      properties: {
        agent: {
          type: "string",
          enum: [
            "product-manager",
            "review-management",
            "growth",
            "content-creation",
            "aso",
            "analytics",
          ],
        },
      },
      required: ["agent"],
    },
  },
];

const AGENT_NPM_SCRIPT: Record<string, string> = {
  "product-manager": "pm",
  "review-management": "reviews",
  growth: "growth",
  "content-creation": "content",
  aso: "aso",
  analytics: "analytics",
};

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  admin: SupabaseClient,
  ownerUserId: string | null,
): Promise<unknown> {
  switch (name) {
    case "get_piton_status":
      return getPitonStatus(admin);
    case "list_recent_agent_runs":
      return listRecentAgentRuns(admin, input);
    case "list_tasks":
      return listTasks(admin, input);
    case "create_task":
      return createTask(admin, input);
    case "list_approvals":
      return listApprovals(admin, input);
    case "create_approval":
      return createApproval(admin, input);
    case "decide_approval":
      return decideApproval(admin, input, ownerUserId);
    case "get_agent_run_report":
      return getAgentRunReport(admin, input);
    case "trigger_agent":
      return triggerAgent(input);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function getPitonStatus(admin: SupabaseClient) {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [profiles, habits, verifications, pendingApprovals, recentRuns] =
    await Promise.all([
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
        .eq("status", "pending"),
      admin
        .from("odie_agent_runs")
        .select("agent, started_at, status, summary")
        .order("started_at", { ascending: false })
        .limit(5),
    ]);

  return {
    total_profiles: profiles.count ?? 0,
    active_habits: habits.count ?? 0,
    verifications_last_7_days: verifications.count ?? 0,
    pending_approvals: pendingApprovals.data ?? [],
    recent_agent_runs: recentRuns.data ?? [],
    note: "Piton has not launched publicly yet — these are internal/test numbers, not production growth metrics.",
  };
}

async function listRecentAgentRuns(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  const limit = typeof input.limit === "number" ? input.limit : 10;
  let query = admin
    .from("odie_agent_runs")
    .select("id, agent, started_at, finished_at, status, summary")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (typeof input.agent === "string") {
    query = query.eq("agent", input.agent);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { runs: data };
}

async function listTasks(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  let query = admin
    .from("odie_tasks")
    .select(
      "id, description, agent, priority, status, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (typeof input.status === "string") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { tasks: data };
}

async function createTask(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("odie_tasks")
    .insert({
      description: String(input.description),
      agent: String(input.agent),
      priority: typeof input.priority === "number" ? input.priority : 3,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { task: data };
}

async function listApprovals(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  let query = admin
    .from("odie_approvals")
    .select("id, task_id, action, summary, status, requested_at, decided_at")
    .order("requested_at", { ascending: false })
    .limit(50);

  if (typeof input.status === "string") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { approvals: data };
}

async function createApproval(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  const { data, error } = await admin
    .from("odie_approvals")
    .insert({
      task_id: typeof input.task_id === "string" ? input.task_id : null,
      action: String(input.action),
      summary: String(input.summary),
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { approval: data };
}

async function decideApproval(
  admin: SupabaseClient,
  input: Record<string, unknown>,
  ownerUserId: string | null,
) {
  const { data, error } = await admin
    .from("odie_approvals")
    .update({
      status: input.decision,
      decided_at: new Date().toISOString(),
      decided_by: ownerUserId,
    })
    .eq("id", String(input.id))
    .select()
    .single();

  if (error) return { error: error.message };
  return { approval: data };
}

async function getAgentRunReport(
  admin: SupabaseClient,
  input: Record<string, unknown>,
) {
  let query = admin
    .from("odie_agent_runs")
    .select("id, agent, started_at, finished_at, status, summary, report")
    .order("started_at", { ascending: false })
    .limit(1);

  if (typeof input.run_id === "string") {
    query = admin
      .from("odie_agent_runs")
      .select("id, agent, started_at, finished_at, status, summary, report")
      .eq("id", input.run_id)
      .limit(1);
  } else if (typeof input.agent === "string") {
    query = query.eq("agent", input.agent);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "No matching agent run found." };
  return { run: data[0] };
}

async function triggerAgent(input: Record<string, unknown>) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const agent = String(input.agent);
  const script = AGENT_NPM_SCRIPT[agent];

  if (!script) {
    return { error: `Unknown agent "${agent}"` };
  }

  if (!token) {
    return {
      configured: false,
      message:
        "GITHUB_DISPATCH_TOKEN isn't set on this Odie deployment, so I can't actually dispatch the workflow — this would run `npm run " +
        script +
        "` inside agents/ via GitHub Actions once that's configured.",
    };
  }

  const owner = process.env.GITHUB_DISPATCH_OWNER ?? "tommyodell1029";
  const repo = process.env.GITHUB_DISPATCH_REPO ?? "piton";
  const ref = process.env.GITHUB_DISPATCH_REF ?? "main";

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/agents-weekly.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref, inputs: { agent: script } }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      configured: true,
      dispatched: false,
      error: `GitHub API ${res.status}: ${text}`,
    };
  }

  return {
    configured: true,
    dispatched: true,
    message: `Dispatched agents-weekly.yml on ${owner}/${repo}@${ref} for the "${agent}" agent.`,
  };
}
