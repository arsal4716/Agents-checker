const cron = require("node-cron");
const { fetchAndSave } = require("../services/crmService");

const SYSTEMS = ["hc", "lm", "pros", "publisher"];

function startCronJob() {
  // Run every 10 minutes: 0,10,20,30,40,50 of every hour
  cron.schedule("*/10 * * * *", async () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[CRON ${timestamp}] Running scheduled CRM checks...`);

    for (const system of SYSTEMS) {
      try {
        const snap = await fetchAndSave(system);
        console.log(`[CRON] ${system.toUpperCase()} — Ready: ${snap.totalReady}, Active: ${snap.totalActive}`);
      } catch (err) {
        console.error(`[CRON] ${system.toUpperCase()} failed:`, err.message);
      }
    }

    console.log(`[CRON ${timestamp}] All checks complete.`);
  });

  console.log("[CRON] Scheduler started — checks every 10 minutes.");
}

module.exports = { startCronJob };
