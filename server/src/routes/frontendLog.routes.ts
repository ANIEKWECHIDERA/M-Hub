import { Router } from "express";
import { FrontendLogController } from "../controllers/frontendLog.controller";
import { frontendLogLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/frontend-logs", frontendLogLimiter, FrontendLogController.create);

export default router;
