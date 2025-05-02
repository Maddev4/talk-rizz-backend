import { Response } from "express";
import { ChatbotRoom } from "../models/chatbot.room";
import { ChatMessage } from "../models/chat.model";
import { AuthenticatedRequest } from "../middleware/auth";
import { Types } from "mongoose";

export class ChatbotController {
  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: userId } = req.user;
      const { mode } = req.params;
      const { page = 1, limit = 50 } = req.query;

      let room = await ChatbotRoom.findOne({ mode });

      if (!room) {
        room = await ChatbotRoom.create({ mode });
        await ChatMessage.create({
          roomId: room._id,
          content: "Hello, how can I help you today?",
          senderId: `${mode} - ${userId} - bot`,
          timestamp: new Date(),
        });
      }

      const messages = await ChatMessage.aggregate([
        { $match: { roomId: new Types.ObjectId(room._id) } },
        { $sort: { timestamp: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      ]);

      res.json({ room, messages: messages.reverse() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { id: userId } = req.user;
      const { mode } = req.params;
      const { content } = req.body;

      const room = await ChatbotRoom.findOne({ mode });

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const message = await ChatMessage.create({
        roomId: room._id,
        content,
        senderId: userId,
        timestamp: new Date(),
      });

      const botMessage = await ChatMessage.create({
        roomId: room._id,
        content: `Hello, how can I help you today? ${content}`,
        senderId: `${mode} - ${userId} - bot`,
        timestamp: new Date(),
      });

      res.json(botMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
}
