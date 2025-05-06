import mongoose, { Document, Schema } from "mongoose";

enum ReportType {
  Like = "like",
  NotVibe = "notVibe",
  Report = "report",
}

export interface IReport extends Document {
  roomId: string;
  senderId: string;
  reportType: ReportType;
  reportDescription: string;
  timestamp: Date;
}

const reportSchema = new Schema({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  reportType: {
    type: String,
    enum: Object.values(ReportType),
    required: true,
  },
  reportDescription: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Report = mongoose.model<IReport>("Report", reportSchema);
