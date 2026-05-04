const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const {
  generateDescription,
  suggestPriority,
  summarizeTasks,
} = require("../controllers/llmController");

// All routes require login
router.use(verifyToken);

// Generate task description — Admin and Manager only
router.post(
  "/generate-description",
  authorizeRoles("ADMIN", "MANAGER"),
  generateDescription
);

// Suggest priority — Admin and Manager only
router.post(
  "/suggest-priority",
  authorizeRoles("ADMIN", "MANAGER"),
  suggestPriority
);

// Summarize tasks — All roles
router.get("/summarize", summarizeTasks);

module.exports = router;