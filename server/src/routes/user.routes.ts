import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { withAuth } from "../utils/withAuth";
import { createUserLimiter } from "../middleware/rateLimiter";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { avatarUpload } from "../middleware/upload";

const router = Router();

router.get(
  "/user",
  verifyFirebaseToken,
  profileSync,
  withAuth(UserController.getUser),
);
router.patch(
  "/user",
  verifyFirebaseToken,
  profileSync,
  avatarUpload.single("avatar"),
  withAuth(UserController.updateUser),
);
router.delete(
  "/user",
  verifyFirebaseToken,
  profileSync,
  withAuth(UserController.deleteUser),
);

router.post(
  "/user",
  verifyFirebaseToken,
  createUserLimiter,
  withAuth(UserController.createUser),
);

export default router;
