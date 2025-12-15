// middleware/rateLimit.ts
import rateLimit from "express-rate-limit";

export const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 signups per IP
  message: { error: "Too many accounts created, try again later" },
});
