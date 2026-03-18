import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

type RequestWithUser = Request & {
  user?: {
    id?: string;
    firebase_uid?: string;
  };
};

const normalizedIpKey = (req: Request) => ipKeyGenerator(req.ip ?? "", 56);

const userAwareKeyGenerator = (req: RequestWithUser) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  if (req.user?.firebase_uid) {
    return `firebase:${req.user.firebase_uid}`;
  }

  return `ip:${normalizedIpKey(req)}`;
};

const ipOnlyKeyGenerator = (req: Request) => `ip:${normalizedIpKey(req)}`;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipOnlyKeyGenerator,
  message: { error: "Too many requests, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipOnlyKeyGenerator,
  message: { error: "Too many authentication requests, try again later" },
});

export const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipOnlyKeyGenerator,
  message: { error: "Too many accounts created, try again later" },
});

export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGenerator,
  message: { error: "Too many invite requests, try again later" },
});

export const workspaceSwitchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGenerator,
  message: { error: "Too many workspace switches, try again later" },
});
