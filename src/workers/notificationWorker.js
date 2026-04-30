const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Notification = require("../models/notification");

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "task-created") {
      const { taskId, title, assignedTo, createdBy } = job.data;

      await Notification.create({
        user: assignedTo,
        triggeredBy: createdBy,
        message: `A new task "${title}" was created and assigned to you.`,
        task: taskId,
      });

      return;
    }

    if (job.name === "task-assigned") {
      const { taskId, title, assignedTo, assignedBy } = job.data;

      await Notification.create({
        user: assignedTo,
        triggeredBy: assignedBy,
        message: `Task "${title}" was assigned to you.`,
        task: taskId,
      });

      return;
    }

    throw new Error(`Unknown notification job: ${job.name}`);
  },
  { connection }
);

notificationWorker.on("completed", (job) => {
  console.log(`Notification job completed: ${job.id}`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(`Notification job failed: ${job?.id}`, error.message);
});

module.exports = notificationWorker;
