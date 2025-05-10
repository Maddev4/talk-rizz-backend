import express, { Request, Response } from "express";
import profileRoutes from "./profile.routes";
import chatRoutes from "./chat.routes";
import connectRoutes from "./connect.route";
import chatbotRoutes from "./chatbot.route";
import reportRoutes from "./report.route";
import { webSocketService } from "../server";
const router = express.Router();

router.use("/profile", profileRoutes);
router.use("/chat", chatRoutes);
router.use("/connect", connectRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/reports", reportRoutes);

router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: `OK`,
  });
});

router.post("/lambda", (req: Request, res: Response) => {
  console.log("Received requests from Python backend:", req.body);
  const { chatrooms } = req.body;
  webSocketService.processRequests(chatrooms);
  res.status(200).json({
    status: `OK`,
  });
});

export default router;
