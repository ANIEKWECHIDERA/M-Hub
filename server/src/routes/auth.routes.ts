// routes/auth.routes.ts
import express from "express";

import authenticate from "../middleware/authenticate";

import { AuthController } from "../controllers/auth.controller";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";

const router = express.Router();

// Sync Firebase user → Supabase (called on first login)
router.post("/sync", verifyFirebaseToken, profileSync, AuthController.syncUser);

router.get(
  "/status",
  verifyFirebaseToken,
  profileSync,
  AuthController.checkProfileComplete,
);

router.post("/logout", authenticate, AuthController.logout);

router.post("/deleteFirebaseUserId", AuthController.deleteFirebaseUser);

export default router;
