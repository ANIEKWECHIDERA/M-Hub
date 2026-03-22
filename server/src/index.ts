import "dotenv/config";
import "./observability/sentry";
import app from "./app";
import { logger } from "./utils/logger";
import { sentry } from "./observability/sentry";
import { testFirebaseConnection } from "./config/firebaseAdmin";
import { testDbConnection } from "./lib/prisma";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database
    const dbReady = await testDbConnection();
    if (!dbReady) throw new Error("Database not ready");

    // Test Firebase
    const firebaseReady = await testFirebaseConnection();
    if (!firebaseReady) throw new Error("Firebase not ready");

    // Start Express server only if all services are ready
    app.listen(PORT, () => {
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
