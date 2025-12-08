// routes/auth.routes.ts
import express from "express";
import { UserService } from "../services/user.service";
import authenticate from "../middleware/authenticate";

const router = express.Router();

// Sync Firebase user → Supabase (called on first login)
router.post("/sync", authenticate, async (req: any, res) => {
  try {
    const { name, email, avatar } = req.body;
    const firebaseUid = req.user.uid;

    const user = await UserService.createOrUpdate({
      firebase_uid: firebaseUid,
      email: email || req.user.email,
      display_name: name || req.user.displayName,
      photo_url: avatar || req.user.photoURL,
    });

    res.json({ profile: user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
