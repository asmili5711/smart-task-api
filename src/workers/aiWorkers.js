const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Task = require("../models/Task");
const logger = require("../config/logger"); // ← added

// ================= HELPER =================
const buildInsight = ({ title, description, priority }) => {
  if (priority === "high") {
    return "This task is marked high priority and may need immediate attention.";
  }

  if (!description || !description.trim()) {
    return "This task has no description. Add more details for better clarity.";
  }

  if (title && title.toLowerCase().includes("urgent")) {
    return "The title suggests urgency. Review priority and due date.";
  }

  return "This task looks normal. Keep the description and deadline updated.";
};

// ================= AI WORKER =================
const aiWorker = new Worker(
  "ai-jobs",
  async (job) => {

    // ── Suggest Task Insights ──────────────────────────────
    if (job.name === "suggest-task-insights") {
      const { taskId, title, description, priority } = job.data;

      logger.info(`AI Worker: processing suggest-task-insights | taskId: ${taskId}`);

      const insight = buildInsight({ title, description, priority });

      await Task.findByIdAndUpdate(taskId, { aiInsight: insight });

      logger.info(`AI Worker: insight saved for task: ${taskId} | insight: "${insight}"`);
      return;
    }

    // ── Weekly Summary ─────────────────────────────────────
    if (job.name === "generate-weekly-summary") {
      logger.info("AI Worker: starting weekly summary generation");

      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentTasks = await Task.find({
          createdAt: { $gte: oneWeekAgo },
        });

        logger.info(`AI Worker: found ${recentTasks.length} tasks from the past week`);

        // TODO: Send to Google Gemini API when LLM feature is built
        logger.info("AI Worker: weekly summary job done - LLM integration pending");
      } catch (error) {
        logger.error(`AI Worker: weekly summary failed: ${error.message}`);
        throw error; // rethrow so BullMQ marks job as failed and retries
      }

      return;
    }

    // ── Unknown Job ────────────────────────────────────────
    logger.warn(`AI Worker: unknown job received: ${job.name}`);
    throw new Error(`Unknown AI job: ${job.name}`);
  },
  { connection }
);

// ================= EVENTS =================
aiWorker.on("completed", (job) => {
  logger.info(`AI Worker: job completed | id: ${job.id} | name: ${job.name}`);
});

aiWorker.on("failed", (job, error) => {
  logger.error(`AI Worker: job failed | id: ${job?.id} | name: ${job?.name} | error: ${error.message}`);
});

module.exports = aiWorker;