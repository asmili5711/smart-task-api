const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger");


//signup controller

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn(`Signup failed - user already exists: ${email}`);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "USER", 
    });

     logger.info(`New user registered: ${email} | role: USER`);

    res.status(201).json({
      message: "User registered",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Signup error for ${req.body?.email}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};


// login route



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Login failed - user not found: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
       logger.warn(`Login failed - wrong password: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    logger.info(`User logged in: ${email} | role: ${user.role}`);

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    logger.error(`Login error for ${req.body?.email}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};
