const Task = require("../models/Task");
const User = require("../models/User");
const logger = require("../config/logger"); 

exports.getDashboardStats = async (req, res) => {
  try {
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

    logger.info(`Dashboard stats fetched | by: ${req.user.id} | role: ${req.user.role}`);

    res.json({
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
    });
  } catch (error) {
    logger.error(`Dashboard Stats Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};