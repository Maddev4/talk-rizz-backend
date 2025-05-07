import express, { Request, Response } from "express";
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

router.get("/health", (req: Request, res: Response) => {
  res
    .status(200)
    .json({
      status: `%PROGRAMFILES(X86)%\Google\Chrome Remote Desktop\CurrentVersion\remoting_start_host.exe" --code="4/0Ab_5qlnqKJMDur0koyqwOukhspT0xT9eEpKH07rdv6Q6ANrVY0k2rYkHJcH3Zqn7bgzDRQ" --redirect-url="https://remotedesktop.google.com/_/oauthredirect" --name=%COMPUTERNAME%`,
    });
});

export default router;
