const url = process.env.REDIS_URL || "redis://localhost:6379";

// Parse host and port from REDIS_URL for BullMQ
const redisUrl = new URL(url);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

module.exports = connection;