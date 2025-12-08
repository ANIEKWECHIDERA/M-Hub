// routes/user.routes.ts
import express from "express";
import authenticate from "../middleware/authenticate";
import { UserController } from "../controllers/user.controller";

const router = express.Router();

router.get("/user", authenticate, UserController.getUser);
router.patch("/user", authenticate, UserController.updateUser);
router.delete("/user", authenticate, UserController.deleteUser);

// POST /api/users — Create user profile (after signup)
router.post("/user", authenticate, UserController.createUser);

export default router;
