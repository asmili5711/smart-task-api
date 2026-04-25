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

router.use(verifyToken);

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

module.exports = router;
