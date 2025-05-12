import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import Connect from "../models/connect.model";
import ConnectRequest from "../models/connect.request.model";

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

  async createConnectRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { requestType } = req.body;
      // Find the latest connect request for this user and request type
      const existingRequest = await ConnectRequest.findOne({
        userId,
        requestType,
        status: "pending",
      }).sort({ createdAt: -1 });

      // If there's already a pending request, return it
      if (existingRequest) {
        const now = new Date();
        const requestAge = now.getTime() - existingRequest.createdAt.getTime();
        const hoursDiff = requestAge / (1000 * 60 * 60);

        if (hoursDiff < 40) {
          return res.json({
            success: false,
            message: `You can only send one request per 40 hours, please wait for ${
              40 - hoursDiff
            } hours before sending another request`,
          });
        }
      }
      const connectRequest = await ConnectRequest.create({
        userId,
        requestType,
      });
      res.status(200).json({
        success: true,
        message: "Connect request sent successfully",
        connectRequest,
      });
    } catch (error) {
      res.status(500).json({ message: "Error sending connect request", error });
    }
  }

  async getConnectRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const { requestType } = req.query;
      const connectRequests = await ConnectRequest.find(
        {
          requestType,
        },
        { _id: 0 }
      );
      res.status(200).json(connectRequests);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error getting connect requests", error });
    }
  }

  async updateConnectRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const { requestId, status } = req.body;
      const connectRequest = await ConnectRequest.findOneAndUpdate(
        { userId, _id: requestId },
        { status },
        { new: true }
      );
      res.status(200).json(connectRequest);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating connect request", error });
    }
  }
}

export default ConnectController;
