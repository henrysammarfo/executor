import cron from "node-cron";

const apiUrl = process.env.API_URL ?? process.env.PUBLIC_APP_URL;
const cronSecret = process.env.CRON_SECRET;
const schedule = process.env.MONITOR_CRON ?? "0 */6 * * *";

if (!apiUrl) {
  throw new Error("Set API_URL or PUBLIC_APP_URL to the deployed EXECUTOR app URL.");
}

if (!cronSecret) {
  throw new Error("Set CRON_SECRET to the same value configured on the app server.");
}

const endpoint = new URL("/api/public/monitor", apiUrl).toString();

async function runMonitor() {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    console.log(`[monitor] ${startedAt} ${body}`);
  } catch (error) {
    console.error(
      `[monitor] ${startedAt} ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

console.log(`[monitor] scheduling ${endpoint} with "${schedule}"`);

if (process.env.RUN_MONITOR_ON_START === "true") {
  await runMonitor();
}

cron.schedule(schedule, runMonitor);
