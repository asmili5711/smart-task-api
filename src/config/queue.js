const { connectRedis } = require("./redis");
const logger = require("./logger");

// Import queue instances
const aiQueue = require("../queues/aiQueue");
const { notificationQueue } = require("../queues/notificationQueue");
const { overdueQueue } = require("../queues/overdueQueue");

// Initialize Redis connection for BullMQ
const initializeQueues = async () => {
  try {
    await connectRedis();
    logger.info("Queue system initialized successfully");
  } catch (error) {
    logger.error(`Failed to initialize queue system: ${error.message}`);
    throw error;
  }
};

// Initialize workers (they automatically start listening to their respective queues)
require("../workers/aiWorkers");
require("../workers/notificationWorker");
require("../workers/overdueWorker");

// Initialize cron jobs (they automatically start scheduling)
require("../cron/cronJobs");

// Initialize queues on load
initializeQueues().catch((error) => {
  logger.error(`Queue initialization error: ${error.message}`);
  process.exit(1);
});

// Export queues for use in controllers and other modules
module.exports = {
  aiQueue,
  notificationQueue,
  overdueQueue,
};
