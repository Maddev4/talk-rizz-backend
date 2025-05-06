import { NextFunction, Router } from "express";
import reportController from "../controllers/report.controller";
import { authenticateUser } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { Request, Response } from "express";
const router = Router();

// Apply authentication middleware to all profile routes
router.use((req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req as AuthenticatedRequest, res, next)
);

// Create a new report
router.post("/:roomId/messages", (req: Request, res: Response) =>
  reportController.createReport(req as AuthenticatedRequest, res)
);

// Get reports for authenticated user
router.get("/:roomId/messages", (req: Request, res: Response) =>
  reportController.getReports(req as AuthenticatedRequest, res)
);

export default router;
