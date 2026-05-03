const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Notification = require("../models/notification");
const Task = require("../models/Task");
const logger = require("../config/logger"); 

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    logger.info(`Notification Worker: job received | name: ${job.name} | id: ${job.id}`);

    switch (job.name) {

      // Task Created 
      case "task-created": {
        const { taskId, title, assignedTo, createdBy } = job.data;

        try {
          await Notification.create({
            user: assignedTo,
            triggeredBy: createdBy,
            message: `A new task "${title}" was created and assigned to you.`,
            task: taskId,
          });
          logger.info(`Notification Worker: task-created notification saved | taskId: ${taskId} | assignedTo: ${assignedTo}`);
        } catch (error) {
          logger.error(`Notification Worker: failed to save task-created notification | taskId: ${taskId} | error: ${error.message}`);
          throw error; // rethrow so BullMQ retries
        }

        break;
      }

      // Task Assigned 
      case "task-assigned": {
        const { taskId, title, assignedTo, assignedBy } = job.data;

        try {
          await Notification.create({
            user: assignedTo,
            triggeredBy: assignedBy,
            message: `Task "${title}" was assigned to you.`,
            task: taskId,
          });
          logger.info(`Notification Worker: task-assigned notification saved | taskId: ${taskId} | assignedTo: ${assignedTo}`);
        } catch (error) {
          logger.error(`Notification Worker: failed to save task-assigned notification | taskId: ${taskId} | error: ${error.message}`);
          throw error; // rethrow so BullMQ retries
        }

        break;
      }

      //  Daily Reminder 
      case "daily-reminder": {
        logger.info("Notification Worker: starting daily reminder processing");

        try {
          const tasks = await Task.find({
            dueDate: { $lte: new Date() },
            status: { $ne: "done" },
          }).select("_id title assignedTo");

          logger.info(`Notification Worker: found ${tasks.length} due tasks for daily reminder`);

          const taskIds = tasks.map((t) => t._id);

          const existing = await Notification.find({
            task: { $in: taskIds },
            message: { $regex: "^Reminder:" },
          }).select("task");

          const existingTaskIds = new Set(existing.map((n) => String(n.task)));

          const toInsert = tasks
            .filter((t) => !existingTaskIds.has(String(t._id)))
            .map((t) => ({
              user: t.assignedTo,
              triggeredBy: null,
              message: `Reminder: Task "${t.title}" is due.`,
              task: t._id,
            }));

          if (toInsert.length > 0) {
            await Notification.insertMany(toInsert);
          }

          logger.info(`Notification Worker: daily reminders done | sent: ${toInsert.length} | skipped duplicates: ${tasks.length - toInsert.length}`);
        } catch (error) {
          logger.error(`Notification Worker: daily reminder failed: ${error.message}`);
          throw error; // rethrow so BullMQ retries
        }

        break;
      }

      //  Unknown Job 
      default:
        logger.warn(`Notification Worker: unknown job received: ${job.name}`);
    }
  },
  { connection }
);

// ================= EVENTS =================
notificationWorker.on("completed", (job) => {
  logger.info(`Notification Worker: job completed | id: ${job.id} | name: ${job.name}`);
});

notificationWorker.on("failed", (job, error) => {
  logger.error(`Notification Worker: job failed | id: ${job?.id} | name: ${job?.name} | error: ${error.message}`);
});

module.exports = notificationWorker;