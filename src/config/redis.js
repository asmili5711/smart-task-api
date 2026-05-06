const { createClient } = require("redis");
const logger = require("./logger");

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("Redis: max retries reached");
        return new Error("Redis max retries reached");
      }
      return Math.min(retries * 100, 3000); // wait longer between retries
    },
  },
});

redisClient.on("error", (err) => {
  logger.error(`Redis Error: ${err.message}`);
});

redisClient.on("reconnecting", () => {
  logger.warn("Redis: reconnecting...");
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info("Redis connected");
    }
  } catch (error) {
    logger.error(`Redis connection failed: ${error.message}`);
  }
};

module.exports = {
  redisClient,
  connectRedis,
};