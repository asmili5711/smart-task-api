const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const Task = require("../models/Task");

const buildInsight = ({ title, description, priority }) => {
  if (priority === "high") {
    return "This task is marked high priority and may need immediate attention.";
  }

  if (!description || !description.trim()) {
    return "This task has no description. Add more details for better clarity.";
  }

  if (title && title.toLowerCase().includes("urgent")) {
    return 'The title suggests urgency. Review priority and due date.';
  }

  return "This task looks normal. Keep the description and deadline updated.";
};

const aiWorker = new Worker(
  "ai-jobs",
  async (job) => {
    if (job.name === "suggest-task-insights") {
      const { taskId, title, description, priority } = job.data;

      const insight = buildInsight({ title, description, priority });

      await Task.findByIdAndUpdate(taskId, {
        aiInsight: insight,
      });

      return;
    }
    // --- PASTE THIS NEW BLOCK ---
    if (job.name === "generate-weekly-summary") {
      console.log("Preparing to send weekly task data to Google Gemini API...");

      // Fetch tasks from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentTasks = await Task.find({
        createdAt: { $gte: oneWeekAgo }
      });
      console.log(`Found ${recentTasks.length} tasks from the past week.`);
      // TODO: Actually send to Google Gemini API when LLM integration is built

      return;
    }
    // ----------------------------


    throw new Error(`Unknown AI job: ${job.name}`);
  },
  { connection }
);

aiWorker.on("completed", (job) => {
  console.log(`AI job completed: ${job.id}`);
});

aiWorker.on("failed", (job, error) => {
  console.error(`AI job failed: ${job?.id}`, error.message);
});

module.exports = aiWorker;
