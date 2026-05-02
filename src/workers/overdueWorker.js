const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Task = require("../models/Task");

const worker = new Worker(
  "overdueQueue",
  async (job) => {
    if (job.name === "update-overdue-tasks") {
      const now = new Date();

      const result = await Task.updateMany(
        {
          dueDate: { $lt: now },
          status: { $ne: "done" },
        },
        { status: "overdue" }
      );

      console.log("✅ Overdue tasks updated:", result.modifiedCount);
    }
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error("❌ Overdue job failed:", err.message);
});