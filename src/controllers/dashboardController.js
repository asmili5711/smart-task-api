const Task = require("../models/Task");
const User = require("../models/User");
const logger = require("../config/logger");
const { redisClient } = require("../config/redis");
const { cacheTtlSeconds } = require("../utils/cacheHelpers");

exports.getDashboardStats = async (req, res) => {
  try {
    const cacheKey = `dashboard:stats:${req.user.role}:${req.user.id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      logger.debug(`Dashboard cache hit: ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    logger.debug(`Dashboard cache miss: ${cacheKey}`);

    const [
      totalUsers,
      totalAdmins,
      totalManagers,
      totalNormalUsers,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
      lowPriorityTasks,
      mediumPriorityTasks,
      highPriorityTasks,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "ADMIN" }),
      User.countDocuments({ role: "MANAGER" }),
      User.countDocuments({ role: "USER" }),
      Task.countDocuments(),
      Task.countDocuments({ status: "todo" }),
      Task.countDocuments({ status: "in-progress" }),
      Task.countDocuments({ status: "done" }),
      Task.countDocuments({ status: "overdue" }),
      Task.countDocuments({ priority: "low" }),
      Task.countDocuments({ priority: "medium" }),
      Task.countDocuments({ priority: "high" }),
    ]);

    const response = {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        managers: totalManagers,
        normalUsers: totalNormalUsers,
      },
      tasks: {
        total: totalTasks,
        todo: todoTasks,
        inProgress: inProgressTasks,
        done: doneTasks,
        overdue: overdueTasks,
      },
      priorities: {
        low: lowPriorityTasks,
        medium: mediumPriorityTasks,
        high: highPriorityTasks,
      },
    };

    await redisClient.setEx(cacheKey, cacheTtlSeconds, JSON.stringify(response));

    logger.info(`Dashboard stats fetched | by: ${req.user.id} | role: ${req.user.role}`);

    res.json(response);
  } catch (error) {
    logger.error(`Dashboard Stats Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};
