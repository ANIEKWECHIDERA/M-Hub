import "dotenv/config";
import "./observability/sentry";
import { createServer } from "http";
import app from "./app";
import { logger } from "./utils/logger";
import { sentry } from "./observability/sentry";
import { testFirebaseConnection } from "./config/firebaseAdmin";
import { testDbConnection } from "./lib/prisma";
import { chatWebSocketService } from "./services/chatWebSocket.service";
import { ScheduledNotificationService } from "./services/scheduledNotification.service";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database
    const dbReady = await testDbConnection();
    if (!dbReady) throw new Error("Database not ready");

    // Test Firebase
    const firebaseReady = await testFirebaseConnection();
    if (!firebaseReady) throw new Error("Firebase not ready");

    // Start a shared HTTP server so chat can migrate from SSE to WebSockets safely.
    const server = createServer(app);
    chatWebSocketService.initialize(server);
    ScheduledNotificationService.start();

    server.listen(PORT, () => {
      logger.info(`[INFO] Server running on port ${PORT}`);
    });
  } catch (err) {
    sentry.captureException(err);
    logger.error("[ERROR] Failed to start server:", err);
    await sentry.flush(2000);
    process.exit(1);
  }
};

startServer();
