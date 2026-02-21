import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authorize } from "../middleware/authorize";
import { verifyFirebaseToken } from "../middleware/verifyFirebaseToken.midddleware";
import { profileSync } from "../middleware/profileSync.middleware";
import { requireAppUser } from "../middleware/requireAppUser.middleware";

const router = Router();
router.use(verifyFirebaseToken);
router.use(profileSync);
router.use(requireAppUser);

router.get(
  "/clients",
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClients,
);

router.get(
  "/clients/:id",
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClientById,
);

router.post(
  "/clients",
  authorize(["admin", "superAdmin"]),
  ClientController.createClient,
);

router.patch(
  "/clients/:id",
  authorize(["admin", "superAdmin"]),
  ClientController.updateClient,
);

router.delete(
  "/clients/:id",
  authorize(["admin", "superAdmin"]),
  ClientController.deleteClient,
);

export default router;
