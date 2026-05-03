const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Task = require("../models/Task");
const logger = require("../config/logger"); // ← added

const worker = new Worker(
  "overdueQueue",
  async (job) => {

    // ── Update Overdue Tasks ───────────────────────────────
    if (job.name === "update-overdue-tasks") {
      logger.info("Overdue Worker: starting overdue task update");

      try {
        const now = new Date();

        const result = await Task.updateMany(
          {
            dueDate: { $lt: now },
            status: { $ne: "done" },
          },
          { status: "overdue" }
        );

        logger.info(`Overdue Worker: update complete | modified: ${result.modifiedCount} tasks`);
      } catch (error) {
        logger.error(`Overdue Worker: failed to update overdue tasks: ${error.message}`);
        throw error; // rethrow so BullMQ retries
      }

      return;
    }

    // ── Unknown Job ────────────────────────────────────────
    logger.warn(`Overdue Worker: unknown job received: ${job.name}`);
    throw new Error(`Unknown overdue job: ${job.name}`);
  },
  { connection }
);

// ================= EVENTS =================
worker.on("completed", (job) => {
  logger.info(`Overdue Worker: job completed | id: ${job.id} | name: ${job.name}`);
});

worker.on("failed", (job, err) => {
  logger.error(`Overdue Worker: job failed | id: ${job?.id} | name: ${job?.name} | error: ${err.message}`);
});

module.exports = worker;