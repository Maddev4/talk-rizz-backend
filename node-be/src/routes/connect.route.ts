import express, { NextFunction } from "express";
import { ConnectController } from "../controllers/connect.controller";
import { AuthenticatedRequest, authenticateUser } from "../middleware/auth";
import { Request, Response } from "express";

const router = express.Router();
const connectController = new ConnectController();

router.use((req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req as AuthenticatedRequest, res, next)
);

router.get("/", (req: Request, res: Response) =>
  connectController.getConnect(req as AuthenticatedRequest, res)
);

// Route to send a connection request
router.put("/", (req: Request, res: Response) =>
  connectController.updateConnect(req as AuthenticatedRequest, res)
);

export default router;
