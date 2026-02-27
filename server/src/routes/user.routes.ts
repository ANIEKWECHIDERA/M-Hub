import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { withAuth } from "../utils/withAuth";
import { createUserLimiter } from "../middleware/rateLimiter";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";
import { profileSync } from "../middleware/profileSync.middleware";

const router = Router();

router.use(verifyFirebaseToken);
router.use(profileSync);

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
