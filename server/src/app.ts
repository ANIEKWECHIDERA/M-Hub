import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.route";
import taskAssigneeRoutes from "./routes/taskAssignee.routes";
import subtaskRoutes from "./routes/subtask.routes";
import companyRoutes from "./routes/company.routes";
import clientRoutes from "./routes/client.routes";
import teamMemberRoutes from "./routes/teamMember.routes";
import projectTeamMemberRoutes from "./routes/projectTeamMembers.routes";
import assetRoutes from "./routes/asset.routes";
import inviteRoutes from "./routes/invite.routes";
import { logger } from "./utils/logger";
import commentRoutes from "./routes/comment.routes";
import noteRoutes from "./routes/note.routes";
import noteTagRoutes from "./routes/noteTag.routes";
import notificationRoutes from "./routes/notification.routes";
import userSettingsRoutes from "./routes/userSettings.routes";
import bodyParser from "body-parser";
import workspaceRoutes from "./routes/workspace.routes";
import { apiLimiter } from "./middleware/rateLimiter";
import cacheRoutes from "./routes/cache.routes";
import chatRoutes from "./routes/chat.routes";
import frontendLogRoutes from "./routes/frontendLog.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import shareArtifactRoutes from "./routes/shareArtifact.routes";
import { chatRealtimeService } from "./services/chatRealtime.service";
import { requestContext } from "./middleware/requestContext.middleware";
import { captureRequestException, isSentryEnabled, sentry } from "./observability/sentry";
import { AppHttpError, sendPublicError } from "./utils/httpErrors";

const app = express();
chatRealtimeService.initialize();

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const isProduction = appEnv === "production";
const configuredOrigins = (
  isProduction
    ? process.env.FRONTEND_URL_PROD
    : process.env.FRONTEND_URL_DEV
)
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const allowedOrigins = new Set(configuredOrigins);

// CORS middleware - env-driven allowlist for local development and production deploys.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
// app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({}));
app.use(express.urlencoded({ extended: true }));
app.use("/api", apiLimiter);
app.use(requestContext);
app.use((req, _res, next) => {
  if (isSentryEnabled()) {
    sentry.setTag("request_id", req.requestId ?? "unknown");
    sentry.setTag("http.path", req.originalUrl || req.path);
  }

  next();
});

// Mount routes
app.use("/api/", authRoutes);
app.use("/api/", userRoutes);
app.use("/api/", projectRoutes);
app.use("/api/", taskRoutes);
app.use("/api/", taskAssigneeRoutes);
app.use("/api/", subtaskRoutes);
app.use("/api/", companyRoutes);
app.use("/api/", clientRoutes);
app.use("/api/", teamMemberRoutes);
app.use("/api/", projectTeamMemberRoutes);
app.use("/api/", assetRoutes);
app.use("/api/", commentRoutes);
app.use("/api/", noteRoutes);
app.use("/api/", noteTagRoutes);
app.use("/api/", notificationRoutes);
app.use("/api/", userSettingsRoutes);
app.use("/api/", inviteRoutes);
app.use("/api/", workspaceRoutes);
app.use("/api/", dashboardRoutes);
app.use("/api/", shareArtifactRoutes);
app.use("/api/", cacheRoutes);
app.use("/api/", chatRoutes);
app.use("/api/", frontendLogRoutes);

// health check endpoint
app.get("/api/health", async (req, res) => {
  req.log?.info("Health check endpoint accessed");
  res.send("Server is running");
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const requestLogger = req.log ?? logger;
    const sentryEventId = captureRequestException(err, req);

    requestLogger.error("Unhandled error", {
      requestId: req.requestId ?? null,
      sentryEventId,
      message: err.message,
      stack: err.stack,
      path: req.originalUrl || req.path,
      method: req.method,
      companyId: req.user?.company_id ?? null,
      userId: req.user?.id ?? null,
    });

    // Multer errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendPublicError(req, res, {
        status: 413,
        error: "File too large",
        code: "FILE_TOO_LARGE",
        details: {
          maxSizeMb: 20,
        },
      });
    }

    if (err instanceof AppHttpError) {
      return sendPublicError(req, res, {
        status: err.status,
        error: err.expose ? err.message : "Something went wrong",
        code: err.code,
        details: err.expose ? err.details : undefined,
      });
    }

    return sendPublicError(req, res, {
      status: err.status || 500,
      error:
        err.status && err.status < 500
          ? err.message || "Request failed"
          : "Something went wrong",
      code: err.code || "INTERNAL_SERVER_ERROR",
    });
  },
);

export default app;
