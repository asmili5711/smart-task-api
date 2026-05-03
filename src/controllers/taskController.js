const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const { redisClient } = require("../config/redis");
const { notificationQueue } = require("../queues/notificationQueue");
const aiQueue = require("../queues/aiQueue");
const logger = require("../config/logger");

const cacheTtlSeconds = Number(process.env.CACHE_TTL_SECONDS) || 60;

// ================= HELPER =================
const clearTaskCache = async () => {
  try {
    const keys = await redisClient.keys("tasks:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`Task cache cleared - ${keys.length} keys removed`);
    }
  } catch (error) {
    logger.error(`Cache clear error: ${error.message}`);
  }
};

// ================= CREATE TASK =================
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      logger.warn(`Access denied on createTask - user: ${req.user.id} | role: ${req.user.role}`);
      return res.status(403).json({ message: "Access denied" });
    }

    if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
      logger.warn(`createTask - invalid assignedTo value: ${assignedTo}`);
      return res.status(400).json({ message: "Valid assigned user required" });
    }

    const user = await User.findById(assignedTo);
    if (!user) {
      logger.warn(`createTask - assigned user not found: ${assignedTo}`);
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user.id,
    });

    logger.info(`Task created: "${task.title}" | id: ${task._id} | by: ${req.user.id}`);

    try {
      await notificationQueue.add(
        "task-created",
        {
          taskId: task._id.toString(),
          title: task.title,
          assignedTo,
          createdBy: req.user.id,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    } catch (error) {
      logger.warn(`Failed to enqueue notification job for task ${task._id}: ${error.message}`);
    }

    try {
      await aiQueue.add(
        "suggest-task-insights",
        {
          taskId: task._id.toString(),
          title: task.title,
          description: task.description,
          priority: task.priority,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    } catch (error) {
      logger.warn(`Failed to enqueue AI job for task ${task._id}: ${error.message}`);
    }

    await clearTaskCache();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.status(201).json({
      message: "Task created",
      task: populatedTask,
    });
  } catch (error) {
    logger.error(`Create Task Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ALL TASKS =================
exports.getAllTasks = async (req, res) => {
  try {
    const filter = {};
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    if (req.user.role === "USER") {
      filter.assignedTo = req.user.id;
    }

    if (req.user.role === "MANAGER") {
      filter.createdBy = req.user.id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const cacheKey = `tasks:${req.user.role}:${req.user.id}:page=${page}:limit=${limit}:status=${req.query.status || ""}:priority=${req.query.priority || ""}:search=${req.query.search || ""}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    logger.debug(`Cache miss: ${cacheKey}`);

    const [totalTasks, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email role"),
    ]);

    const response = {
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
      limit,
    };

    await redisClient.setEx(cacheKey, cacheTtlSeconds, JSON.stringify(response));

    logger.info(`getAllTasks [user:${req.user.id} | role:${req.user.role}] - returned ${tasks.length} tasks`);

    res.json(response);
  } catch (error) {
    logger.error(`Get All Tasks Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET TASK BY ID =================
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      logger.warn(`getTaskById - invalid task id: ${taskId}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      logger.warn(`getTaskById - task not found: ${taskId}`);
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isManagerOwner =
      req.user.role === "MANAGER" &&
      task.createdBy._id.toString() === req.user.id.toString();
    const isAssignedUser =
      task.assignedTo &&
      task.assignedTo._id.toString() === req.user.id.toString();

    if (!isAdmin && !isManagerOwner && !isAssignedUser) {
      logger.warn(`getTaskById - access denied [user:${req.user.id} | task:${taskId}]`);
      return res.status(403).json({ message: "Access denied" });
    }

    logger.info(`Task fetched: ${taskId} by user: ${req.user.id}`);

    res.json({ task });
  } catch (error) {
    logger.error(`Get Task By ID Error [id:${req.params?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE TASK =================
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      logger.warn(`updateTask - invalid task id: ${taskId}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      logger.warn(`updateTask - task not found: ${taskId}`);
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isManagerOwner =
      req.user.role === "MANAGER" &&
      task.createdBy.toString() === req.user.id.toString();
    const isAssignedUser =
      task.assignedTo &&
      task.assignedTo.toString() === req.user.id.toString();

    if (!isAdmin && !isManagerOwner && !isAssignedUser) {
      logger.warn(`updateTask - access denied [user:${req.user.id} | task:${taskId}]`);
      return res.status(403).json({ message: "Access denied" });
    }

    if (isAssignedUser && !isAdmin && !isManagerOwner) {
      if (!req.body.status) {
        logger.warn(`updateTask - user ${req.user.id} tried to update fields other than status`);
        return res.status(403).json({ message: "You can only update task status" });
      }
      task.status = req.body.status;
    } else {
      const { assignedTo, ...updates } = req.body;
      Object.assign(task, updates);
    }

    await task.save();
    await clearTaskCache();

    logger.info(`Task updated: ${taskId} by user: ${req.user.id}`);

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.json({ message: "Task updated", task: populatedTask });
  } catch (error) {
    logger.error(`Update Task Error [id:${req.params?.id} | user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ASSIGN TASK =================
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      logger.warn(`assignTask - access denied [user:${req.user.id} | role:${req.user.role}]`);
      return res.status(403).json({ message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`assignTask - invalid task id: ${id}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      logger.warn(`assignTask - invalid assignedTo id: ${assignedTo}`);
      return res.status(400).json({ message: "Invalid assigned user id" });
    }

    const task = await Task.findById(id);
    if (!task) {
      logger.warn(`assignTask - task not found: ${id}`);
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role === "MANAGER" &&
      task.createdBy.toString() !== req.user.id.toString()
    ) {
      logger.warn(`assignTask - manager ${req.user.id} tried to assign task they don't own: ${id}`);
      return res.status(403).json({ message: "Managers can assign only their tasks" });
    }

    const user = await User.findById(assignedTo);
    if (!user) {
      logger.warn(`assignTask - assigned user not found: ${assignedTo}`);
      return res.status(404).json({ message: "User not found" });
    }

    task.assignedTo = assignedTo;
    await task.save();

    logger.info(`Task ${id} assigned to user ${assignedTo} by ${req.user.id}`);

    try {
      await notificationQueue.add(
        "task-assigned",
        {
          taskId: task._id.toString(),
          title: task.title,
          assignedTo,
          assignedBy: req.user.id,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    } catch (error) {
      logger.warn(`Failed to enqueue notification job for assignTask ${id}: ${error.message}`);
    }

    await clearTaskCache();

    res.json({ message: "Task assigned" });
  } catch (error) {
    logger.error(`Assign Task Error [id:${req.params?.id} | user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE TASK =================
exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      logger.warn(`deleteTask - invalid task id: ${taskId}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      logger.warn(`deleteTask - task not found: ${taskId}`);
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role === "ADMIN" ||
      (req.user.role === "MANAGER" &&
        task.createdBy.toString() === req.user.id.toString())
    ) {
      await Task.findByIdAndDelete(taskId);
      await clearTaskCache();
      logger.info(`Task deleted: ${taskId} by user: ${req.user.id} | role: ${req.user.role}`);
      return res.json({ message: "Task deleted" });
    }

    logger.warn(`deleteTask - access denied [user:${req.user.id} | task:${taskId}]`);
    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    logger.error(`Delete Task Error [id:${req.params?.id} | user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};