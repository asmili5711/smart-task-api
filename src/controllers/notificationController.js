const Notification = require("../models/notification");
const logger = require("../config/logger"); // ← added

// ================= GET NOTIFICATIONS =================
exports.getNotifications = async (req, res) => {
  try {
    let filter = {};

    if (["USER", "MANAGER"].includes(req.user.role)) {
      filter.user = req.user.id;
    }

    if (req.user.role === "ADMIN") {
      filter = {};
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 });

    logger.info(`Notifications fetched - user: ${req.user.id} | role: ${req.user.role} | count: ${notifications.length}`);

    res.status(200).json(notifications);
  } catch (error) {
    logger.error(`Get Notifications Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= MARK AS READ =================
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      logger.warn(`markAsRead - notification not found: ${req.params.id}`);
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.user.toString() !== req.user.id) {
      logger.warn(`markAsRead - unauthorized access [user:${req.user.id} | notification:${req.params.id}]`);
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.status = "read";
    await notification.save();

    logger.info(`Notification marked as read: ${req.params.id} | user: ${req.user.id}`);

    res.json({ message: "Marked as read" });
  } catch (error) {
    logger.error(`Mark As Read Error [id:${req.params?.id} | user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};