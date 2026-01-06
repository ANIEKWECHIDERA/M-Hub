import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import authenticate from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/clients",
  authenticate,
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClients
);

router.get(
  "/clients/:id",
  authenticate,
  authorize(["team_member", "admin", "superAdmin"]),
  ClientController.getClientById
);

router.post(
  "/clients",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ClientController.createClient
);

router.patch(
  "/clients/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ClientController.updateClient
);

router.delete(
  "/clients/:id",
  authenticate,
  authorize(["admin", "superAdmin"]),
  ClientController.deleteClient
);

export default router;
