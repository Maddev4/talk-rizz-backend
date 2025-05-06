import express from "express";
import profileRoutes from "./profile.routes";
import chatRoutes from "./chat.routes";
import connectRoutes from "./connect.route";
import chatbotRoutes from "./chatbot.route";
import reportRoutes from "./report.route";
const router = express.Router();

router.use("/profile", profileRoutes);
router.use("/chat", chatRoutes);
router.use("/connect", connectRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/reports", reportRoutes);

export default router;
