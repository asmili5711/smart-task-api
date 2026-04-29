const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log(" Redis connected");
    }
  } catch (error) {
    console.error(" Redis connection failed:", error);
  }
};

module.exports = {
  redisClient,
  connectRedis,
};