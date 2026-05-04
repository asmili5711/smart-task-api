const logger = require("../config/logger");
const Task = require("../models/Task");
const {
  generateTaskDescription,
  suggestTaskPriority,
  summarizeTasks,
} = require("../services/geminiService");

// ================= GENERATE DESCRIPTION =================
exports.generateDescription = async (req, res) => {
  try {
    const { title, priority } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    logger.info(`LLM: generateDescription requested | title: "${title}" | by: ${req.user.id}`);

    const description = await generateTaskDescription(title, priority || "medium");

    res.json({
      message: "Description generated successfully",
      description,
    });
  } catch (error) {
    logger.error(`LLM: generateDescription failed: ${error.message}`);
    res.status(500).json({ message: "Failed to generate description" });
  }
};

// ================= SUGGEST PRIORITY =================
exports.suggestPriority = async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    logger.info(`LLM: suggestPriority requested | title: "${title}" | by: ${req.user.id}`);

    const priority = await suggestTaskPriority(title, description, dueDate);

    res.json({
      message: "Priority suggested successfully",
      priority,
    });
  } catch (error) {
    logger.error(`LLM: suggestPriority failed: ${error.message}`);
    res.status(500).json({ message: "Failed to suggest priority" });
  }
};

// ================= SUMMARIZE TASKS =================
exports.summarizeTasks = async (req, res) => {
  try {
    logger.info(`LLM: summarizeTasks requested | by: ${req.user.id}`);

    // Get tasks based on role
    const filter = {};
    if (req.user.role === "USER") filter.assignedTo = req.user.id;
    if (req.user.role === "MANAGER") filter.createdBy = req.user.id;

    const tasks = await Task.find(filter).limit(20);

    if (tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found to summarize" });
    }

    const summary = await summarizeTasks(tasks);

    res.json({
      message: "Tasks summarized successfully",
      totalTasks: tasks.length,
      summary,
    });
  } catch (error) {
    logger.error(`LLM: summarizeTasks failed: ${error.message}`);
    res.status(500).json({ message: "Failed to summarize tasks" });
  }
};