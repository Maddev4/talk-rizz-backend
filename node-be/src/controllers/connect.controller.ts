import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import Connect from "../models/connect.model";

export class ConnectController {
  async getConnect(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const connect = await Connect.findOne({ userId });
      res.status(200).json(connect);
    } catch (error) {
      res.status(500).json({ message: "Error getting connect", error });
    }
  }

  async updateConnect(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      let connect = await Connect.findOne({ userId });

      if (!connect) {
        // Create new connect document if it doesn't exist
        connect = await Connect.create({
          userId,
          ...req.body,
        });
      } else {
        // Update existing connect document
        connect = await Connect.findOneAndUpdate({ userId }, req.body, {
          new: true,
        });
      }

      res.status(200).json(connect);
    } catch (error) {
      res.status(500).json({ message: "Error updating connect", error });
    }
  }
}

export default ConnectController;
