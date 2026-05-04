const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Task = require("../models/Task");
const logger = require("../config/logger");
const {
  generateTaskDescription,
  suggestTaskPriority,
  generateWeeklySummary,
} = require("../services/geminiService");

// ================= AI WORKER =================
const aiWorker = new Worker(
  "ai-jobs",
  async (job) => {

    // ── Suggest Task Insights ──────────────────────────────
    if (job.name === "suggest-task-insights") {
      const { taskId, title, description, priority } = job.data;

      logger.info(`AI Worker: processing suggest-task-insights | taskId: ${taskId}`);

      try {
        // Generate AI description if task has no description
        let aiDescription = description;
        if (!description || !description.trim()) {
          aiDescription = await generateTaskDescription(title, priority);
          await Task.findByIdAndUpdate(taskId, { description: aiDescription });
          logger.info(`AI Worker: description generated and saved for task: ${taskId}`);
        }

        // Suggest priority using Gemini
        const suggestedPriority = await suggestTaskPriority(title, aiDescription, null);
        await Task.findByIdAndUpdate(taskId, {
          aiInsight: `AI Suggested Priority: ${suggestedPriority}. Task has been analyzed and description updated if missing.`,
        });

        logger.info(`AI Worker: insights saved for task: ${taskId} | suggested priority: ${suggestedPriority}`);
      } catch (error) {
        logger.error(`AI Worker: suggest-task-insights failed for task ${taskId}: ${error.message}`);
        throw error; // rethrow so BullMQ retries
      }

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

        if (recentTasks.length === 0) {
          logger.info("AI Worker: no tasks found for weekly summary — skipping");
          return;
        }

        const summary = await generateWeeklySummary(recentTasks);

        // Save summary to DB as a special task or log it
        logger.info(`AI Worker: weekly summary generated:\n${summary}`);

      } catch (error) {
        logger.error(`AI Worker: weekly summary failed: ${error.message}`);
        throw error;
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