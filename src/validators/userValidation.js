const Joi = require("joi");

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().uppercase().valid("MANAGER", "USER").optional(),
});

const updateMyProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().trim().lowercase().email().optional(),
}).min(1);

const userIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

module.exports = {
  createUserSchema,
  updateMyProfileSchema,
  userIdParamSchema,
};
