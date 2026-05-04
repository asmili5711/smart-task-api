const { GoogleGenAI } = require("@google/genai");
const logger = require("../config/logger");

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ================= GENERATE TASK DESCRIPTION =================
const generateTaskDescription = async (title, priority) => {
  try {
    logger.info(`Gemini: generating description for task: "${title}"`);

    const prompt = `
      You are a project management assistant.
      Generate a clear, professional and concise task description (2-3 sentences) for a task with:
      Title: "${title}"
      Priority: "${priority}"
      Only return the description text. No extra explanation or formatting.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const description = result.text.trim();

    logger.info(`Gemini: description generated for task: "${title}"`);
    return description;
  } catch (error) {
    logger.error(`Gemini: generateTaskDescription failed: ${error.message}`);
    throw error;
  }
};

// ================= SUGGEST TASK PRIORITY =================
const suggestTaskPriority = async (title, description, dueDate) => {
  try {
    logger.info(`Gemini: suggesting priority for task: "${title}"`);

    const prompt = `
      You are a project management assistant.
      Based on the following task details suggest the priority level.
      Title: "${title}"
      Description: "${description || "No description provided"}"
      Due Date: "${dueDate || "No due date"}"
      Reply with only one word: low, medium, or high.
      No explanation. No punctuation. Just the single word.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const priority = result.text.trim().toLowerCase();

    // Validate response is one of the expected values
    const validPriorities = ["low", "medium", "high"];
    const finalPriority = validPriorities.includes(priority) ? priority : "medium";

    logger.info(`Gemini: priority suggested for task "${title}": ${finalPriority}`);
    return finalPriority;
  } catch (error) {
    logger.error(`Gemini: suggestTaskPriority failed: ${error.message}`);
    throw error;
  }
};

// ================= SUMMARIZE TASKS =================
const summarizeTasks = async (tasks) => {
  try {
    logger.info(`Gemini: summarizing ${tasks.length} tasks`);

    const taskList = tasks
      .map(
        (t, i) =>
          `${i + 1}. Title: ${t.title} | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.dueDate || "No due date"}`
      )
      .join("\n");

    const prompt = `
      You are a project management assistant.
      Analyze the following tasks and provide:
      1. A brief overall summary (2-3 sentences)
      2. Key insights (2-3 bullet points)
      3. Recommendations (2-3 bullet points)

      Tasks:
      ${taskList}

      Keep the response clear, concise and professional.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const summary = result.text.trim();

    logger.info(`Gemini: summary generated for ${tasks.length} tasks`);
    return summary;
  } catch (error) {
    logger.error(`Gemini: summarizeTasks failed: ${error.message}`);
    throw error;
  }
};

// ================= WEEKLY SUMMARY =================
const generateWeeklySummary = async (tasks) => {
  try {
    logger.info(`Gemini: generating weekly summary for ${tasks.length} tasks`);

    const taskList = tasks
      .map(
        (t, i) =>
          `${i + 1}. Title: ${t.title} | Status: ${t.status} | Priority: ${t.priority} | Due: ${t.dueDate || "No due date"}`
      )
      .join("\n");

    const prompt = `
      You are a project management assistant.
      Generate a weekly productivity report based on these tasks from the past week:

      ${taskList}

      Include:
      1. Overall productivity summary
      2. Tasks completed vs pending
      3. High priority items that need attention
      4. Recommendations for next week

      Keep it professional and concise.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const summary = result.text.trim();

    logger.info("Gemini: weekly summary generated successfully");
    return summary;
  } catch (error) {
    logger.error(`Gemini: generateWeeklySummary failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateTaskDescription,
  suggestTaskPriority,
  summarizeTasks,
  generateWeeklySummary,
};