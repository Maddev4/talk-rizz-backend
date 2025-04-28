import "tsconfig-paths/register";
import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/error";
import routes from "./routes";
import { createServer } from "http";
import { WebSocketService } from "./services/websocket.service";

// Load environment variables
dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const port = process.env.PORT || 8087;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket
const webSocketService = new WebSocketService(httpServer);

// API routes
app.use("/api", routes);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

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
