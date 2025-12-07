//set up an express app
import express from "express";
import authRoutes from "./routes/auth.routes";
import morgan from "morgan";
import { logger } from "./utils/logger";

const app = express();
app.use(express.json());

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
// Mount auth routes
app.use("/api/sync", authRoutes);

// health check endpoint
app.get("/api/health", async (req, res) => {
  res.send("Server is running");
});

export default app;
