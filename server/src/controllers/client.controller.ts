import { Request, Response } from "express";
import { ClientService } from "../services/client.service";
import { logger } from "../utils/logger";

export const ClientController = {
  async getClients(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const clients = await ClientService.findAll(companyId);
      return res.json(clients);
    } catch (error) {
      logger.error("getClients failed", { error });
      return res.status(500).json({ error: "Failed to fetch clients" });
    }
  },

  async getClientById(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    try {
      const client = await ClientService.findById(companyId, id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      return res.json(client);
    } catch (error) {
      logger.error("getClientById failed", { error });
      return res.status(500).json({ error: "Failed to fetch client" });
    }
  },

  async createClient(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const client = await ClientService.create(companyId, req.body);
      return res.status(201).json(client);
    } catch (error) {
      logger.error("createClient failed", { error });
      return res.status(500).json({ error: "Failed to create client" });
    }
  },

  async updateClient(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    try {
      const client = await ClientService.update(companyId, id, req.body);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      return res.json(client);
    } catch (error) {
      logger.error("updateClient failed", { error });
      return res.status(500).json({ error: "Failed to update client" });
    }
  },

  async deleteClient(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    try {
      await ClientService.deleteById(companyId, id);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteClient failed", { error });
      return res.status(500).json({ error: "Failed to delete client" });
    }
  },
};
