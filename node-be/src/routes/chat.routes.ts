import { NextFunction, Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { AuthenticatedRequest, authenticateUser } from "../middleware/auth";
import { Request, Response } from "express";

const router = Router();
const chatController = new ChatController();

// Apply authentication middleware to all conversation routes
router.use((req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req as AuthenticatedRequest, res, next)
);

router.post("/rooms", (req: Request, res: Response) =>
  chatController.createRoom(req as AuthenticatedRequest, res)
);
router.get("/rooms", (req: Request, res: Response) =>
  chatController.getRooms(req as AuthenticatedRequest, res)
);
router.get("/rooms/:roomId/messages", (req: Request, res: Response) =>
  chatController.getMessages(req as AuthenticatedRequest, res)
);
router.put("/rooms/:roomId/read", (req: Request, res: Response) =>
  chatController.markMessagesAsRead(req as AuthenticatedRequest, res)
);

export default router;
