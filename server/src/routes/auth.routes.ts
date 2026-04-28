import express from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { authLimiter, authStatusLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Sync Firebase user → Supabase (called on first login)
router.post(
  "/sync",
  authLimiter,
  verifyFirebaseToken,
  profileSync,
  AuthController.syncUser,
);

router.get(
  "/status",
  authStatusLimiter,
  verifyFirebaseToken,
  profileSync,
  AuthController.checkProfileComplete,
);

router.post(
  "/logout",
  authLimiter,
  verifyFirebaseToken,
  profileSync,
  AuthController.logout,
);

router.post(
  "/deleteFirebaseUserId",
  authLimiter,
  verifyFirebaseToken,
  AuthController.deleteFirebaseUser,
);

export default router;
