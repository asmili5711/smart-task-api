const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { overdueQueue } = require("../queues/overdueQueue");
const { notificationQueue } = require("../queues/notificationQueue");
const aiQueue = require("../queues/aiQueue");
const logger = require("../config/logger"); // ← added

// ================= OVERDUE JOB → Every Hour =================
cron.schedule("0 * * * *", async () => {
  logger.info("Cron started: overdue task updater");

  try {
    await overdueQueue.add("update-overdue-tasks", {}, {
      jobId: "overdue-job",
      removeOnComplete: true,
    });
    logger.info("Cron: overdue job enqueued successfully");
  } catch (error) {
    logger.error(`Cron: failed to enqueue overdue job: ${error.message}`);
  }
});

// ================= DAILY REMINDER → 9 AM Every Day =================
cron.schedule("0 9 * * *", async () => {
  logger.info("Cron started: daily reminder");

  try {
    await notificationQueue.add("daily-reminder", {}, {
      jobId: "daily-reminder-job",
      removeOnComplete: true,
    });
    logger.info("Cron: daily reminder job enqueued successfully");
  } catch (error) {
    logger.error(`Cron: failed to enqueue daily reminder job: ${error.message}`);
  }
});

// ================= WEEKLY AI SUMMARY → Sunday Midnight =================
cron.schedule("0 0 * * 0", async () => {
  logger.info("Cron started: weekly AI summary");

  try {
    await aiQueue.add("generate-weekly-summary", {}, {
      jobId: `weekly-ai-summary-${Date.now()}`,
      removeOnComplete: true,
    });
    logger.info("Cron: weekly AI summary job enqueued successfully");
  } catch (error) {
    logger.error(`Cron: failed to enqueue weekly AI summary job: ${error.message}`);
  }
});

// ================= LOG CLEANUP → Sunday Midnight =================
cron.schedule("0 0 * * 0", async () => {
  logger.info("Cron started: log cleanup");

  try {
    const logsDir = path.join(__dirname, "../../logs");

    if (!fs.existsSync(logsDir)) {
      logger.warn("Cron: logs directory not found, skipping cleanup");
      return;
    }

    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    files.forEach((file) => {
      if (file.endsWith(".log")) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > sevenDaysMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          logger.info(`Cron: deleted old log file: ${file}`);
        }
      }
    });

    if (deletedCount === 0) {
      logger.info("Cron: log cleanup done - no old files found");
    } else {
      logger.info(`Cron: log cleanup done - deleted ${deletedCount} file(s)`);
    }
  } catch (error) {
    logger.error(`Cron: log cleanup failed: ${error.message}`);
  }
});