import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Writes a dated markdown report under agents/reports/<agentName>/, so each
 * agent run leaves an auditable artifact. GitHub Actions workflows can
 * upload these as build artifacts or commit them back to the repo.
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
    ...sections.flatMap(({ heading, content }) => [`## ${heading}`, "", content, ""]),
  ].join("\n");

  await writeFile(filePath, body, "utf-8");
  console.log(`[report] wrote ${filePath}`);
  return filePath;
}
