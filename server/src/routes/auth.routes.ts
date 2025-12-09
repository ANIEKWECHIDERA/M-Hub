// routes/auth.routes.ts
import express from "express";
import { UserService } from "../services/user.service";
import authenticate from "../middleware/authenticate";
import { revokeUserTokens } from "../config/firebaseAdmin";
import { logger } from "../utils/logger";

const router = express.Router();

// Sync Firebase user → Supabase (called on first login)
router.post("/sync", authenticate, async (req: any, res) => {
  try {
    const { name, email, avatar } = req.body;
    const firebaseUid = req.user.uid;
    const existingUser = await UserService.findByFirebaseUid(firebaseUid);

    if (!existingUser) {
      const user = await UserService.createOrUpdate({
        firebase_uid: firebaseUid,
        email: email || req.user.email,
        display_name: name || req.user.displayName,
        photo_url: avatar || req.user.photoURL,
      });
      return res.json({ profile: user });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", authenticate, async (req: any, res) => {
  try {
    const uid = req.user.uid;
    await revokeUserTokens(uid);
    res.json({ message: "Successfully logged out and revoked tokens" });
  } catch (err: any) {
    logger.error("Logout error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
