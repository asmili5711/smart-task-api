const User = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const logger = require("../config/logger"); // ← added

// ================= GET MY PROFILE =================
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      logger.warn(`getMyProfile - user not found: ${req.user.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Profile fetched: ${req.user.id}`);
    res.json({ user });
  } catch (error) {
    logger.error(`Get My Profile Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE MY PROFILE =================
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== req.user.id.toString()) {
      logger.warn(`updateMyProfile - email already in use: ${email} | user: ${req.user.id}`);
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      logger.warn(`updateMyProfile - user not found: ${req.user.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`Profile updated: ${req.user.id} | new email: ${email}`);
    res.json({ message: "Profile updated", user });
  } catch (error) {
    logger.error(`Update My Profile Error [user:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET ALL USERS (Admin) =================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    logger.info(`getAllUsers - fetched ${users.length} users | by admin: ${req.user.id}`);
    res.json({ users });
  } catch (error) {
    logger.error(`Get All Users Error [admin:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET USER BY ID =================
exports.getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`getUserById - invalid user id: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      logger.warn(`getUserById - user not found: ${req.params.id}`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User fetched: ${req.params.id} | by: ${req.user.id}`);
    res.json({ user });
  } catch (error) {
    logger.error(`Get User By ID Error [id:${req.params?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= DELETE USER (Admin) =================
exports.deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`deleteUser - invalid user id: ${req.params.id}`);
      return res.status(400).json({ message: "Invalid user id" });
    }

    const userId = req.params.id;
    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      logger.warn(`deleteUser - user not found: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.id.toString() === userId) {
      logger.warn(`deleteUser - admin tried to delete own account: ${userId}`);
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    if (userToDelete.role && userToDelete.role.toUpperCase() === "ADMIN") {
      logger.warn(`deleteUser - admin tried to delete another admin: ${userId}`);
      return res.status(403).json({ message: "Cannot delete another admin" });
    }

    await User.findByIdAndDelete(userId);

    logger.info(`User deleted: ${userId} | by admin: ${req.user.id}`);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error(`Delete User Error [id:${req.params?.id} | admin:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE USER (Admin) =================
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (role && role.toUpperCase() === "ADMIN") {
      logger.warn(`createUser - admin tried to create another admin | by: ${req.user.id}`);
      return res.status(400).json({ message: "You cannot create another admin" });
    }

    const normalizedRole = role ? role.toUpperCase() : "USER";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`createUser - user already exists: ${email} | by admin: ${req.user.id}`);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
    });

    logger.info(`User created: ${email} | role: ${normalizedRole} | by admin: ${req.user.id}`);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error(`Create User Error [admin:${req.user?.id}]: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};