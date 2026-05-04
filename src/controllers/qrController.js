const QRCode = require("qrcode");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const logger = require("../config/logger");

// ================= GENERATE QR CODE =================
exports.generateQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`generateQRCode - invalid task id: ${id}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(id);
    if (!task) {
      logger.warn(`generateQRCode - task not found: ${id}`);
      return res.status(404).json({ message: "Task not found" });
    }

    // Check access
    const isAdmin = req.user.role === "ADMIN";
    const isManagerOwner =
      req.user.role === "MANAGER" &&
      task.createdBy.toString() === req.user.id.toString();
    const isAssignedUser =
      task.assignedTo &&
      task.assignedTo.toString() === req.user.id.toString();

    if (!isAdmin && !isManagerOwner && !isAssignedUser) {
      logger.warn(`generateQRCode - access denied [user:${req.user.id} | task:${id}]`);
      return res.status(403).json({ message: "Access denied" });
    }

    // Generate task URL
    const taskUrl = `${process.env.BASE_URL}/api/tasks/${id}`;

    // Generate QR code as base64 image
    const qrCodeBase64 = await QRCode.toDataURL(taskUrl);

    logger.info(`QR code generated for task: ${id} | by: ${req.user.id}`);

    res.json({
      message: "QR code generated successfully",
      taskId: id,
      taskTitle: task.title,
      taskUrl,
      qrCode: qrCodeBase64, // base64 image → paste in browser to see QR
    });
  } catch (error) {
    logger.error(`generateQRCode Error [id:${req.params?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= SCAN QR CODE → GET TASK DETAILS =================
exports.getTaskByQR = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`getTaskByQR - invalid task id: ${id}`);
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      logger.warn(`getTaskByQR - task not found: ${id}`);
      return res.status(404).json({ message: "Task not found" });
    }

    // Check access
    const isAdmin = req.user.role === "ADMIN";
    const isManagerOwner =
      req.user.role === "MANAGER" &&
      task.createdBy._id.toString() === req.user.id.toString();
    const isAssignedUser =
      task.assignedTo &&
      task.assignedTo._id.toString() === req.user.id.toString();

    if (!isAdmin && !isManagerOwner && !isAssignedUser) {
      logger.warn(`getTaskByQR - access denied [user:${req.user.id} | task:${id}]`);
      return res.status(403).json({ message: "Access denied" });
    }

    logger.info(`Task fetched via QR scan: ${id} | by: ${req.user.id}`);

    res.json({
      message: "Task fetched successfully via QR",
      task,
    });
  } catch (error) {
    logger.error(`getTaskByQR Error [id:${req.params?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};