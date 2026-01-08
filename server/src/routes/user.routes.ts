import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { UserController } from "../controllers/user.controller";
import { withAuth } from "../utils/withAuth";
import { createUserLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/user", authenticate, withAuth(UserController.getUser));
router.patch("/user", authenticate, withAuth(UserController.updateUser));
router.delete("/user", authenticate, withAuth(UserController.deleteUser));

router.post(
  "/user",
  createUserLimiter,
  authenticate,
  withAuth(UserController.createUser)
);

export default router;
