// src/routes/auth.routes.ts
import express from "express";
import admin from "../config/firebaseAdmin";
import { supabaseAdmin } from "../config/supabaseClient";

const router = express.Router();

router.post("/sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).send("No token");
    const idToken = authHeader.split(" ")[1];
    if (!idToken) return res.status(401).send("No token");

    // verify Firebase token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const emailFromToken = decoded.email ?? null;

    // optional body info (name/avatar) from frontend
    const { name, email, avatar } = req.body as {
      name?: string;
      email?: string;
      avatar?: string;
    };

    const emailToStore = email ?? emailFromToken;
    if (!emailToStore) return res.status(400).send("No email provided");

    // Upsert user (create if not exists)
    const upsertPayload = {
      firebaseUid: firebaseUid,
      email: emailToStore,
      displayName: name ?? null,
      photoURL: avatar ?? null,
      lastLogin: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(upsertPayload, { onConflict: "firebase_uid" })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ user: data });
  } catch (err: any) {
    console.error(err);
    return res.status(401).json({ error: err.message });
  }
});

export default router;
