import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
const protectedRoute = [verifyFirebaseToken, profileSync, requireAppUser];

router.get(
  "/clients",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClients,
);

router.get(
  "/clients/:id",
  ...protectedRoute,
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClientById,
);

router.post(
  "/clients",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ClientController.createClient,
);

router.patch(
  "/clients/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ClientController.updateClient,
);

router.delete(
  "/clients/:id",
  ...protectedRoute,
  authorize(["admin", "superAdmin"]),
  ClientController.deleteClient,
);

export default router;
