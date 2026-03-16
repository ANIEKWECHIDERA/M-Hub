import rateLimit from "express-rate-limit";

const defaultKeyGenerator = (req: any) => req.ip ?? req.headers["x-forwarded-for"];

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: defaultKeyGenerator,
  message: { error: "Too many requests, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: defaultKeyGenerator,
  message: { error: "Too many authentication requests, try again later" },
});

export const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: defaultKeyGenerator,
  message: { error: "Too many accounts created, try again later" },
});

export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: defaultKeyGenerator,
  message: { error: "Too many invite requests, try again later" },
});

export const workspaceSwitchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: defaultKeyGenerator,
  message: { error: "Too many workspace switches, try again later" },
});
