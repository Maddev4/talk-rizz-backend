import { Server as SocketServer } from "socket.io";
import { Server } from "http";
import { verifyToken } from "../middleware/auth";
import { ChatMessage, IChatMessage } from "../models/chat.model";
import { ChatRoom, IChatRoom } from "../models/chat.room.model";
import { Types } from "mongoose";
import { Profile } from "../models/profile.model";

export class WebSocketService {
  private io: SocketServer;

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication error"));
        }

        const decoded = await verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error("Authentication error"));
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.data.user.id}`);

      // Join user to their rooms
      this.handleUserRooms(socket);

      // Handle joining a specific room
      socket.on("join_room", async ({ roomId }) => {
        // Check if socket is already in the room
        const isInRoom = socket.rooms.has(roomId);
        if (isInRoom) {
          return;
        }
        socket.join(roomId);
        // console.log(`User ${socket.data.user.id} joined room ${roomId}`);
      });

      // Handle leaving a room
      socket.on("leave_room", ({ roomId }) => {
        socket.leave(roomId);
        // console.log(`User ${socket.data.user.id} left room ${roomId}`);
      });

      // Handle new messages
      socket.on("send_message", async (messageData) => {
        try {
          const newMessage = await this.saveMessage({
            ...messageData,
            roomId: new Types.ObjectId(messageData.roomId),
            senderId: socket.data.user.id,
          });

          // Update the room's last message
          await this.updateRoomLastMessage(newMessage);

          const sender = await Profile.findOne(
            { userId: newMessage.senderId },
            { basicProfile: 1, _id: 0 }
          );

          console.log("sender", sender);

          // Broadcast the message to the room
          this.io.to(messageData.roomId).emit("new_message", {
            ...newMessage,
            sender: {
              name: sender?.basicProfile?.name,
              avatar: sender?.basicProfile?.profilePicture,
            },
          });
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // Handle typing indicator
      socket.on("typing", ({ roomId }) => {
        socket.to(roomId).emit("user_typing", {
          userId: socket.data.user.id,
          roomId,
        });
      });

      // Handle new room added
      socket.on("new_room", (room) => {
        console.log("new room added", room);
        this.addNewChatRoom(room, socket);
      });

      // Handle marking messages as read
      socket.on("mark_as_read", ({ roomId }) => {
        console.log("marking messages as read", roomId);
        this.markMessagesAsRead(roomId, socket);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.data.user.id}`);
      });
    });
  }

  private async handleUserRooms(socket: any) {
    try {
      // Find rooms where the user's ID exists in the participants array using aggregate
      const rooms = await ChatRoom.aggregate([
        {
          $match: {
            participants: { $in: [socket.data.user.id] },
            // Using string comparison since the user ID is a UUID
            $expr: {
              $in: [socket.data.user.id, "$participants"],
            },
          },
        },
        {
          $project: {
            _id: 1,
          },
        },
      ]);

      // Join each room that the user is a participant in
      rooms.forEach((room) => {
        socket.join(room._id.toString());
        // console.log(`User ${socket.data.user.id} auto-joined room ${room._id}`);
      });
    } catch (error) {
      console.error("Error joining user rooms:", error);
    }
  }

  private async saveMessage(
    messageData: Partial<IChatMessage>
  ): Promise<IChatMessage> {
    const message = new ChatMessage({
      ...messageData,
      timestamp: new Date(),
    });
    await message.save();
    return message;
  }

  private async updateRoomLastMessage(message: IChatMessage) {
    await ChatRoom.findByIdAndUpdate(message.roomId, {
      lastMessage: message,
      lastActivity: new Date(),
    });
  }

  private async addNewChatRoom(newRoom: IChatRoom, socket: any) {
    try {
      const { participants, type } = newRoom;

      // For direct messages, check if room already exists
      if (type === "direct") {
        const existingRoom = await ChatRoom.findOne({
          type: "direct",
          participants: { $all: participants },
        });

        if (existingRoom) {
          console.log("existingRoom", existingRoom);
          return existingRoom;
        }
      }

      const room = new ChatRoom({
        participants,
        type,
      });

      const savedRoom = await room.save();

      // Get participant profiles
      const roomWithParticipants = await ChatRoom.aggregate([
        { $match: { _id: savedRoom._id } },
        {
          $lookup: {
            from: "profiles",
            let: { participants: "$participants" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $in: ["$userId", "$$participants"] }],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  userId: 1,
                  name: "$basicProfile.name",
                  avatar: "$basicProfile.profilePicture",
                },
              },
            ],
            as: "others",
          },
        },
      ]);

      socket.join(savedRoom._id.toString());
      // Get the socket of the other participant and make them join the room
      const otherParticipant = participants.find(
        (p) => p !== socket.data.user.id
      );
      const otherSocket = Array.from(this.io.sockets.sockets.values()).find(
        (s) => s.data.user.id === otherParticipant
      );
      const others = roomWithParticipants[0].others;
      delete roomWithParticipants[0].others;
      if (otherSocket) {
        otherSocket.emit("new_room", {
          ...roomWithParticipants[0],
          other: others.find((o: any) => o.userId !== otherParticipant),
        });
      }
      socket.emit("new_room", {
        ...roomWithParticipants[0],
        other: others.find((o: any) => o.userId !== socket.data.user.id),
      });
    } catch (error) {
      console.error("Error adding new chat room:", error);
    }
  }

  private async markMessagesAsRead(roomId: string, socket: any) {
    await ChatMessage.updateMany(
      {
        roomId,
        senderId: { $ne: socket.data.user.id },
        read: false,
      },
      { read: true }
    );
    // Update the room's last message
    this.io.to(roomId).emit("message_read", roomId);
  }
}
