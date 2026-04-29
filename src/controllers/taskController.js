const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const { redisClient } = require("../config/redis");

const cacheTtlSeconds = Number(process.env.CACHE_TTL_SECONDS) || 60;

// ================= HELPER =================
const clearTaskCache = async () => {
  try {
    const keys = await redisClient.keys("tasks:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("Cache cleared");
    }
  } catch (error) {
    console.error("Cache clear error:", error);
  }
};

// ================= CREATE TASK =================
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!assignedTo || !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: "Valid assigned user required" });
    }

    const user = await User.findById(assignedTo);
    if (!user) {
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

    await clearTaskCache();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.status(201).json({
      message: "Task created",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create Task Error:", error);
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

    //  Stable cache key (FIXED)
    const cacheKey = `tasks:${req.user.role}:${req.user.id}:page=${page}:limit=${limit}:status=${req.query.status || ""}:priority=${req.query.priority || ""}:search=${req.query.search || ""}`;

    console.log("Cache Key:", cacheKey);

    //  Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("Serving from cache");
      return res.json(JSON.parse(cached));
    }

    console.log("Cache MISS -> DB hit");

    //  DB queries
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

    console.log("Saving to cache...");

    await redisClient.setEx(cacheKey, cacheTtlSeconds, JSON.stringify(response));

    console.log("Saved to cache");

    res.json(response);
  } catch (error) {
    console.error("Get Tasks Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET TASK BY ID =================
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
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
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ task });
  } catch (error) {
    console.error("Get Task Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE TASK =================
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
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
      return res.status(403).json({ message: "Access denied" });
    }

    if (isAssignedUser && !isAdmin && !isManagerOwner) {
      if (!req.body.status) {
        return res.status(403).json({
          message: "You can only update task status",
        });
      }
      task.status = req.body.status;
    } else {
      const { assignedTo, ...updates } = req.body;
      Object.assign(task, updates);
    }

    await task.save();
    await clearTaskCache();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.json({
      message: "Task updated",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Update Task Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ASSIGN TASK =================
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: "Invalid assigned user id" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role === "MANAGER" &&
      task.createdBy.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        message: "Managers can assign only their tasks",
      });
    }

    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    task.assignedTo = assignedTo;
    await task.save();

    await clearTaskCache();

    res.json({ message: "Task assigned" });
  } catch (error) {
    console.error("Assign Task Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE TASK =================
exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role === "ADMIN" ||
      (req.user.role === "MANAGER" &&
        task.createdBy.toString() === req.user.id.toString())
    ) {
      await Task.findByIdAndDelete(taskId);
      await clearTaskCache();
      return res.json({ message: "Task deleted" });
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
