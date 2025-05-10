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

router.post("/request", (req: Request, res: Response) =>
  connectController.createConnectRequest(req as AuthenticatedRequest, res)
);

router.get("/requests", (req: Request, res: Response) =>
  connectController.getConnectRequests(req as AuthenticatedRequest, res)
);

router.put("/requests", (req: Request, res: Response) =>
  connectController.updateConnectRequest(req as AuthenticatedRequest, res)
);

export default router;
