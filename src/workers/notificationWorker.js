const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Notification = require("../models/notification");
const Task = require("../models/Task");

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    switch (job.name) {

      //  Task Created
      case "task-created": {
        const { taskId, title, assignedTo, createdBy } = job.data;

        await Notification.create({
          user: assignedTo,
          triggeredBy: createdBy,
          message: `A new task "${title}" was created and assigned to you.`,
          task: taskId,
        });

        break;
      }

      //  Task Assigned
      case "task-assigned": {
        const { taskId, title, assignedTo, assignedBy } = job.data;

        await Notification.create({
          user: assignedTo,
          triggeredBy: assignedBy,
          message: `Task "${title}" was assigned to you.`,
          task: taskId,
        });

        break;
      }

      //  NEW: Daily Reminder (for cron)
      case "daily-reminder": {
        const tasks = await Task.find({
          dueDate: { $lte: new Date() },
          status: { $ne: "done" },
        }).select("_id title assignedTo");

        // 1) Get taskIds
        const taskIds = tasks.map(t => t._id);

        // 2) Find already notified tasks
        const existing = await Notification.find({
          task: { $in: taskIds },
          message: { $regex: "^Reminder:" },
        }).select("task");

        const existingTaskIds = new Set(existing.map(n => String(n.task)));

        // 3) Prepare only new notifications
        const toInsert = tasks
          .filter(t => !existingTaskIds.has(String(t._id)))
          .map(t => ({
            user: t.assignedTo,
            triggeredBy: null,
            message: `Reminder: Task "${t.title}" is due.`,
            task: t._id,
          }));

        // 4) Insert in one go
        if (toInsert.length > 0) {
          await Notification.insertMany(toInsert);
        }

        console.log(`Daily reminders created: ${toInsert.length} (skipped duplicates: ${tasks.length - toInsert.length})`);
        break;
      }

      //  Default case (don’t crash system)
      default:
        console.warn(`Unknown notification job: ${job.name}`);
    }
  },
  { connection }
);

//  Success log
notificationWorker.on("completed", (job) => {
  console.log(`Notification job completed: ${job.id}`);
});

//  Failure log
notificationWorker.on("failed", (job, error) => {
  console.error(` Notification job failed: ${job?.id}`, error.message);
});

module.exports = notificationWorker;