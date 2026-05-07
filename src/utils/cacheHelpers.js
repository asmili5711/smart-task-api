const { redisClient } = require("../config/redis");
const logger = require("../config/logger");

const cacheTtlSeconds = Number(process.env.CACHE_TTL_SECONDS) || 60;

const clearCacheByPattern = async (pattern, label) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`${label} cache cleared - ${keys.length} keys removed`);
    }
  } catch (error) {
    logger.error(`${label} cache clear error: ${error.message}`);
  }
};

const clearTaskCache = async () => clearCacheByPattern("tasks:*", "Task");

const clearDashboardCache = async () =>
  clearCacheByPattern("dashboard:stats:*", "Dashboard");

module.exports = {
  cacheTtlSeconds,
  clearTaskCache,
  clearDashboardCache,
};
