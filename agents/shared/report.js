import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getSupabaseAdmin } from "./supabaseAdmin.js";

/**
 * Writes a dated markdown report under agents/reports/<agentName>/, so each
 * agent run leaves an auditable artifact. GitHub Actions workflows can
 * upload these as build artifacts or commit them back to the repo.
 *
 * Also persists a row to `odie_agent_runs` (Supabase) when the service-role
 * key is configured, so Odie's stateless web client can list run history
 * without filesystem access — `agents/reports/` itself is gitignored and
 * never leaves the machine/runner it was written on.
 *
 * Returns { filePath, agentRunId } — agentRunId is null when the Supabase
 * insert was skipped or failed, so callers can still create a follow-up
 * odie_approvals row referencing this run.
 */
export async function writeReport(agentName, title, sections) {
  const dir = path.join(process.cwd(), "reports", agentName);
  await mkdir(dir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const filePath = path.join(dir, `${date}.md`);

  const body = [
    `# ${title}`,
    "",
    `_Generated ${new Date().toISOString()}_`,
    "",
    ...sections.flatMap(({ heading, content }) => [
      `## ${heading}`,
      "",
      content,
      "",
    ]),
  ].join("\n");

  await writeFile(filePath, body, "utf-8");
  console.log(`[report] wrote ${filePath}`);

  const agentRunId = await recordAgentRun(agentName, title, sections);

  return { filePath, agentRunId };
}

async function recordAgentRun(agentName, title, sections) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.log(
      "[report] SUPABASE_SERVICE_ROLE_KEY not set — skipping odie_agent_runs insert",
    );
    return null;
  }

  const { data, error } = await supabase
    .from("odie_agent_runs")
    .insert({
      agent: agentName,
      finished_at: new Date().toISOString(),
      status: "completed",
      summary: title,
      report: { sections },
    })
    .select("id")
    .single();

  if (error) {
    console.error(
      `[report] failed to record odie_agent_runs row: ${error.message}`,
    );
    return null;
  }

  return data.id;
}
