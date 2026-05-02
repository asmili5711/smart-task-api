const cron = require("node-cron");
const { overdueQueue } = require("../queues/overdueQueue");
const { notificationQueue } = require("../queues/notificationQueue");
const aiQueue = require("../queues/aiQueue"); // Added this import

// Overdue Job → every hour
cron.schedule("0 * * * *", async () => {
    console.log("Running overdue cron job...");

    await overdueQueue.add("update-overdue-tasks", {}, {
        jobId: "overdue-job",
        removeOnComplete: true
    });
});

// Daily Reminder → every day at 9 AM
cron.schedule("0 9 * * *", async () => {
    console.log(" Running daily reminder cron job...");

    await notificationQueue.add("daily-reminder", {}, {
        jobId: "daily-reminder-job",
        removeOnComplete: true
    });
});

// 3. Weekly AI Summary → Sunday at midnight
cron.schedule("0 0 * * 0", async () => {
    console.log("Running weekly AI summary cron job...");
    await aiQueue.add("generate-weekly-summary", {}, {
        jobId: `weekly-ai-summary-${Date.now()}`,
        removeOnComplete: true
    });
});

// 4. Log Cleanup Job → Weekly on Sunday at midnight
cron.schedule("0 0 * * 0", async () => {
    console.log("Running log cleanup cron job...");
    const logsDir = path.join(__dirname, "../../logs");

    if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        files.forEach(file => {
            if (file.endsWith(".log")) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > sevenDaysMs) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old log file: ${file}`);
                }
            }
        });
    }
});