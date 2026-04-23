const User = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");


exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
    

// updateprofile

exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const existingUser = await User.findOne({ email });

        if (existingUser && existingUser._id.toString() !== req.user.id.toString()) {
    return res.status(400).json({
        message: "Email already in use",
    });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// get all users for admin

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//get user by id information

exports.getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


//delete user by admin

exports.deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const userId = req.params.id;

    const userToDelete = await User.findById(userId);

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.id.toString() === userId) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    if (userToDelete.role && userToDelete.role.toUpperCase() === "ADMIN") {
      return res.status(403).json({
        message: "Cannot delete another admin",
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


//create user by admin

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

     if (role && role.toUpperCase() === "ADMIN") {
      return res.status(400).json({
        message: "You cannot create another admin",
      });
    }

    const normalizedRole = role ? role.toUpperCase() : "USER";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
    });

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
    res.status(500).json({
      message: "Server error",
    });
  }
};
