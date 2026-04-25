const Joi = require("joi");

// ================= COMMON =================
const objectId = Joi.string().hex().length(24);

// ================= PARAM =================
const taskIdParamSchema = Joi.object({
  id: objectId.required(),
});

// ================= CREATE TASK =================
const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required(),
  description: Joi.string().trim().max(1000).allow("").optional(),

  // Match DB format
  status: Joi.string()
    .valid("todo", "in-progress", "done", "overdue")
    .optional(),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .optional(),

  dueDate: Joi.date().greater("now").optional(),

  assignedTo: objectId.required(),
});

// ================= UPDATE TASK =================
// ADMIN / MANAGER use this
const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).optional(),
  description: Joi.string().trim().max(1000).allow("").optional(),

  status: Joi.string()
    .valid("todo", "in-progress", "done", "overdue")
    .optional(),

  priority: Joi.string()
    .valid("low", "medium", "high")
    .optional(),

  dueDate: Joi.date().greater("now").allow(null).optional(),

}).min(1);

// ================= USER STATUS UPDATE =================
// USER should only use this
const updateTaskStatusSchema = Joi.object({
  status: Joi.string()
    .valid("todo", "in-progress", "done", "overdue")
    .required(),
});

// ================= ASSIGN TASK =================
const assignTaskSchema = Joi.object({
  assignedTo: objectId.required(),
});

const taskQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  status: Joi.string()
    .valid("todo", "in-progress", "done", "overdue")
    .optional(),
  priority: Joi.string()
    .valid("low", "medium", "high")
    .optional(),
  search: Joi.string().trim().min(1).max(100).optional(),
});


module.exports = {
  taskIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  taskQuerySchema,
};
