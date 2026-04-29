const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { getDashboardStats } = require("../controllers/dashboardController");

router.use(verifyToken);

router.get("/stats", authorizeRoles("ADMIN"), getDashboardStats);

module.exports = router;
