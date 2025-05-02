import mongoose, { Document, Schema } from "mongoose";

export interface IChatbotRoom extends Document {
  _id: string;
  mode: string;
}

const chatbotRoomSchema = new Schema({
  mode: {
    type: String,
    required: true,
  },
});

export const ChatbotRoom = mongoose.model<IChatbotRoom>(
  "ChatbotRoom",
  chatbotRoomSchema
);
