import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage extends Document {
  roomId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

const chatMessageSchema = new Schema({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

export const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema
);
