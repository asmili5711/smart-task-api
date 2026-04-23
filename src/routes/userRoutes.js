const express = require("express");
const router = express.Router();

const {
  createUser,  
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  deleteUser,
} = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { validateBody, validateParams } = require("../middleware/validate");
const {
  createUserSchema,
  updateMyProfileSchema,
  userIdParamSchema,
} = require("../validators/userValidation");

router.get("/me", verifyToken, getMyProfile);
router.put("/me", verifyToken, validateBody(updateMyProfileSchema), updateMyProfile);

router.post("/", verifyToken, authorizeRoles("ADMIN"), validateBody(createUserSchema), createUser);
router.get("/", verifyToken, authorizeRoles("ADMIN"), getAllUsers);
router.get("/:id", verifyToken, authorizeRoles("ADMIN"), validateParams(userIdParamSchema), getUserById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), validateParams(userIdParamSchema), deleteUser);




module.exports = router;
