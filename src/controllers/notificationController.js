const Notification = require("../models/notification");

// ✅ GET notifications
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

    res.status(200).json(notifications);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ MARK AS READ (paste here)
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // 🔒 Security check
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.status = "read";
    await notification.save();

    res.json({ message: "Marked as read" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};