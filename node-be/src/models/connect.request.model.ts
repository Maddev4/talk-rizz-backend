import { Schema, model } from "mongoose";

interface IConnectRequest {
  userId: string;
  requestType: "surpriseMe";
  status: "pending" | "matched" | "expired";
  createdAt: Date;
  matchedUserId?: string;
  matchedAt?: Date;
}

const connectRequestSchema = new Schema<IConnectRequest>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  requestType: {
    type: String,
    required: true,
    enum: ["surpriseMe"],
    default: "surpriseMe",
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "matched", "expired"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  matchedUserId: {
    type: String,
    required: false,
  },
  matchedAt: {
    type: Date,
    required: false,
  },
});

// Index to help find pending requests
connectRequestSchema.index({ status: 1, createdAt: 1 });

const ConnectRequest = model<IConnectRequest>(
  "ConnectRequest",
  connectRequestSchema
);

export default ConnectRequest;
