import "tsconfig-paths/register";
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/error";
import routes from "./routes";
import { createServer } from "http";
import { WebSocketService } from "./services/websocket.service";
import admin from "./services/firebase.service";

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const port = process.env.PORT || 8087;

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize FCM
console.log("Initializing Firebase Cloud Messaging...");
if (admin) {
  console.log("Firebase initialized successfully");
} else {
  console.warn("Firebase initialization failed! Push notifications will not work.");
}

// Initialize WebSocket
export const webSocketService = new WebSocketService(httpServer);

// API routes
app.use("/api", routes);

// Error handling middleware (should be last)
app.use(errorHandler);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rizz")
  .then(() => {
    console.log("Connected to MongoDB");
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

export default app;
