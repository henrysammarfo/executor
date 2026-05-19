import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const secretKeys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_GENAI_USE_ENTERPRISE",
  "GOOGLE_AGENT_PLATFORM_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GEMINI_PRO_MODEL",
  "GEMINI_FLASH_MODEL",
  "SPEECHMATICS_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "ASANA_ACCESS_TOKEN",
  "ASANA_PROJECT_GID",
  "NOTION_TOKEN",
  "NOTION_DATABASE_ID",
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "JIRA_PROJECT_KEY",
  "CRON_SECRET",
  "INGEST_WEBHOOK_SECRET",
  "PUBLIC_APP_URL",
];

function parseEnv(path) {
  const env = new Map();
  const content = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env.set(key, value);
  }
  return env;
}

const env = parseEnv(".env");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const secrets = {};

for (const key of secretKeys) {
  const value = env.get(key);
  if (!value) {
    console.log(`[skip] ${key}`);
    continue;
  }

  console.log(`[queue] ${key}`);
  secrets[key] = value;
}

if (Object.keys(secrets).length === 0) {
  console.log("No secrets found in .env.");
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "executor-cf-secrets-"));
const file = join(dir, "secrets.json");

try {
  writeFileSync(file, JSON.stringify(secrets), { encoding: "utf8", mode: 0o600 });
  const result = spawnSync(npx, ["wrangler", "secret", "bulk", file], {
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(result.error.message);
  }

  if (result.status !== 0) {
    console.error(`wrangler secret bulk failed with exit code ${result.status ?? "unknown"}`);
    process.exit(result.status ?? 1);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
