import { Request, Response } from "express";
import { ChatRoom } from "../models/chat.room.model";
import { ChatMessage } from "../models/chat.model";
import { AuthenticatedRequest } from "../middleware/auth";
import { Types } from "mongoose";

export class ChatController {
  async createRoom(req: AuthenticatedRequest, res: Response) {
    try {
      const { participants, type } = req.body;

      // For direct messages, check if room already exists
      if (type === "direct") {
        const existingRoom = await ChatRoom.findOne({
          type: "direct",
          participants: { $all: participants },
        });

        if (existingRoom) {
          return res.json(existingRoom);
        }
      }

      const room = new ChatRoom({
        participants,
        type,
      });

      await room.save().then((room) => {
        res.status(201).json(room);
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create chat room" });
    }
  }

  async getRooms(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const rooms = await ChatRoom.aggregate([
        {
          $match: { participants: userId },
        },
        {
          $lookup: {
            from: "chatmessages",
            localField: "lastMessage",
            foreignField: "_id",
            as: "lastMessage",
          },
        },
        {
          $unwind: {
            path: "$lastMessage",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "profiles",
            let: { participants: "$participants" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$userId", "$$participants"] },
                      { $ne: ["$userId", userId] },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  name: "$basicProfile.name",
                  avatar: "$basicProfile.profilePicture",
                },
              },
            ],
            as: "other",
          },
        },
        {
          $unwind: {
            path: "$other",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $sort: { lastActivity: -1 },
        },
      ]);

      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      console.log("roomId", roomId);

      const room = await ChatRoom.findById(roomId);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const messages = await ChatMessage.aggregate([
        { $match: { roomId: new Types.ObjectId(roomId) } },
        {
          $lookup: {
            from: "profiles",
            localField: "senderId",
            foreignField: "userId",
            as: "sender",
          },
        },
        { $unwind: "$sender" },
        {
          $project: {
            _id: 1,
            content: 1,
            timestamp: 1,
            read: 1,
            senderId: 1,
            sender: {
              username: "$sender.name",
              avatar: "$sender.avatar",
            },
          },
        },
        { $sort: { timestamp: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      ]);

      res.json(messages.reverse());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }

  async markMessagesAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      await ChatMessage.updateMany(
        {
          roomId,
          senderId: { $ne: userId },
          read: false,
        },
        { read: true }
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  }
}
