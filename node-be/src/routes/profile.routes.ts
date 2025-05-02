import express, { Request, Response, NextFunction } from "express";
import { ProfileController } from "../controllers/profile.controller";
import { authenticateUser } from "@/middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import fileUpload from "express-fileupload";

const router = express.Router();
const profileController = new ProfileController();

// Apply authentication middleware to all profile routes
router.use((req: Request, res: Response, next: NextFunction) =>
  authenticateUser(req as AuthenticatedRequest, res, next)
);

// Apply file upload middleware
router.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
  })
);

// Profile routes
router.get("/", (req: Request, res: Response) =>
  profileController.getUserProfile(req as AuthenticatedRequest, res)
);

router.get("/:userId", (req: Request, res: Response) =>
  profileController.getUserProfileById(req as AuthenticatedRequest, res)
);

router.post("/", (req: Request, res: Response) =>
  profileController.createProfile(req as AuthenticatedRequest, res)
);

router.put("/", (req: Request, res: Response) => {
  // Parse the profile data from formData
  const profileData = JSON.parse(req.body.profile);
  req.body = profileData;
  console.log("profileData", profileData);
  return profileController.updateProfile(req as AuthenticatedRequest, res);
});

router.get("/match", (req: Request, res: Response) =>
  profileController.getMatchProfile(req as AuthenticatedRequest, res)
);

router.get("/others", (req: Request, res: Response) =>
  profileController.getOtherProfiles(req as AuthenticatedRequest, res)
);
// Premium features

router.post("/premium/upgrade", (req: Request, res: Response) =>
  profileController.upgradeToPremium(req as AuthenticatedRequest, res)
);

export default router;
