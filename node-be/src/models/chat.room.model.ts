import mongoose, { Document, Schema } from "mongoose";
import { IChatMessage } from "./chat.model";

export interface IChatRoom extends Document {
  _id: string;
  participants: string[];
  lastMessage?: IChatMessage;
  lastActivity: Date;
  type: "direct" | "group";
  name?: string;
}

const chatRoomSchema = new Schema({
  participants: [
    {
      type: String,
      required: true,
    },
  ],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "ChatMessage",
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ["direct", "group"],
    default: "direct",
  },
});

export const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema);
