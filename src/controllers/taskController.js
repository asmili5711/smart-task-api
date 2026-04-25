const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");

// ================= CREATE TASK =================
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo } = req.body;

    // Only ADMIN / MANAGER
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

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.status(201).json({
      message: "Task created",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ALL TASKS =================
exports.getAllTasks = async (req, res) => {
  try {
    const filter = {};
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // USER → only assigned tasks
    if (req.user.role === "USER") {
      filter.assignedTo = req.user.id;
    }

    // MANAGER → only tasks they created
    if (req.user.role === "MANAGER") {
      filter.createdBy = req.user.id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const totalTasks = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.json({
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
      limit,
    });
  } catch (error) {
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

    // ❌ Not allowed
    if (!isAdmin && !isManagerOwner && !isAssignedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ================= ROLE-BASED UPDATE =================

    // USER → only update status
    if (isAssignedUser && !isAdmin && !isManagerOwner) {
      if (!req.body.status) {
        return res.status(403).json({
          message: "You can only update task status",
        });
      }

      task.status = req.body.status;
    } else {
      // ADMIN / MANAGER → full update (except assignedTo)
      const { assignedTo, ...updates } = req.body;
      Object.assign(task, updates);
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.json({
      message: "Task updated",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ASSIGN TASK =================
exports.assignTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { assignedTo } = req.body;

    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: "Invalid assigned user id" });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Manager can assign only own tasks
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

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    res.json({
      message: "Task assigned",
      task: populatedTask,
    });
  } catch (error) {
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

    // ADMIN → delete any
    if (req.user.role === "ADMIN") {
      await Task.findByIdAndDelete(taskId);
      return res.json({ message: "Task deleted" });
    }

    // MANAGER → delete own tasks only
    if (
      req.user.role === "MANAGER" &&
      task.createdBy.toString() === req.user.id.toString()
    ) {
      await Task.findByIdAndDelete(taskId);
      return res.json({ message: "Task deleted" });
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
