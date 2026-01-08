//set up an express app
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
import morgan from "morgan";
import { logger } from "./utils/logger";
import commentRoutes from "./routes/comment.routes";
import noteRoutes from "./routes/note.routes";
import noteTagRoutes from "./routes/noteTag.routes";
import notificationRoutes from "./routes/notification.routes";
import userSettingsRoutes from "./routes/userSettings.routes";

const app = express();
app.use(express.json());

// CORS middleware - Allow all origins
app.use(
  cors({
    origin: true, // This allows all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);
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

// health check endpoint
app.get("/api/health", async (req, res) => {
  console.log("Health check endpoint accessed");
  res.send("Server is running");
});

export default app;
