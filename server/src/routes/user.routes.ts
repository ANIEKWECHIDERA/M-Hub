import { Router } from "express";
import authenticate from "../middleware/authenticate";
import { UserController } from "../controllers/user.controller";
import { withAuth } from "../utils/withAuth";
import { createUserLimiter } from "../middleware/rateLimiter";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { profileSync } from "../middleware/profileSync.middleware";

const router = Router();

router.use(verifyFirebaseToken);
router.use(profileSync);

router.get("/user", withAuth(UserController.getUser));
router.patch("/user", withAuth(UserController.updateUser));
router.delete("/user", withAuth(UserController.deleteUser));

router.post(
  "/user",
  createUserLimiter,
  authenticate,
  withAuth(UserController.createUser),
);

export default router;
