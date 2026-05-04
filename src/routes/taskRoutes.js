const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { validateBody, validateParams, validateQuery } = require("../middleware/validate");
const {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  taskIdParamSchema,
  taskQuerySchema,
} = require("../validators/taskValidation");

const {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  assignTask,
  deleteTask,
} = require("../controllers/taskController");

const {
  generateQRCode,
  getTaskByQR,
} = require("../controllers/qrController"); // ← added

router.use(verifyToken);

// ================= TASK ROUTES =================
router.post(
  "/",
  authorizeRoles("ADMIN", "MANAGER"),
  validateBody(createTaskSchema),
  createTask
);

router.get("/", validateQuery(taskQuerySchema), getAllTasks);

router.get(
  "/:id",
  validateParams(taskIdParamSchema),
  getTaskById
);

router.patch(
  "/:id",
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  updateTask
);

router.patch(
  "/:id/assign",
  authorizeRoles("ADMIN", "MANAGER"),
  validateParams(taskIdParamSchema),
  validateBody(assignTaskSchema),
  assignTask
);

router.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  validateParams(taskIdParamSchema),
  deleteTask
);

// ================= QR CODE ROUTES =================
router.get(
  "/:id/qr",
  validateParams(taskIdParamSchema),
  generateQRCode
);

router.get(
  "/:id/scan",
  validateParams(taskIdParamSchema),
  getTaskByQR
);

module.exports = router;