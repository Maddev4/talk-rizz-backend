import { NextFunction, Router } from "express";
import { ChatbotController } from "../controllers/chatbot.controller";
import { AuthenticatedRequest, authenticateUser } from "../middleware/auth";
import { Request, Response } from "express";

const router = Router();
const chatbotController = new ChatbotController();

// Apply authentication middleware to all conversation routes
router.use((req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req as AuthenticatedRequest, res, next)
);

router.get("/rooms/:mode/messages", (req: Request, res: Response) =>
  chatbotController.getMessages(req as AuthenticatedRequest, res)
);

router.post("/:mode/messages", (req: Request, res: Response) =>
  chatbotController.sendMessage(req as AuthenticatedRequest, res)
);

export default router;
