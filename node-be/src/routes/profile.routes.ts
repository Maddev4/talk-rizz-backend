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
    useTempFiles: false,
  })
);

// Profile routes
router.get("/", (req: Request, res: Response) =>
  profileController.getUserProfile(req as AuthenticatedRequest, res)
);

router.get("/others", (req: Request, res: Response) =>
  profileController.getOtherProfiles(req as AuthenticatedRequest, res)
);

router.get("/:userId", (req: Request, res: Response) =>
  profileController.getUserProfileById(req as AuthenticatedRequest, res)
);

router.post("/", (req: Request, res: Response) =>
  profileController.createProfile(req as AuthenticatedRequest, res)
);

router.put("/", (req: Request, res: Response) => {
  try {
    console.log("Profile update request headers:", req.headers);
    console.log(
      "Profile update request content-type:",
      req.headers["content-type"]
    );
    console.log("Profile update req.body:", req.body);
    console.log("Profile update req.files:", req.files);

    // Check if this is a FormData request (multipart/form-data)
    const isFormData = req.headers["content-type"]?.includes(
      "multipart/form-data"
    );

    if (isFormData && req.body.profile) {
      // Handle FormData request - parse the profile JSON from FormData
      try {
        const profileData = JSON.parse(req.body.profile);
        req.body = profileData;
        console.log("Parsed profile data from FormData:", profileData);
      } catch (parseError) {
        console.error("Error parsing profile JSON from FormData:", parseError);
        return res.status(400).json({ error: "Invalid profile data format" });
      }
    } else if (!isFormData) {
      // Handle JSON request - profile data is already in req.body
      console.log("Processing JSON request, profile data:", req.body);
    } else {
      // FormData request but no profile data found
      console.error("FormData request missing profile data");
      return res.status(400).json({ error: "Profile data is required" });
    }

    return profileController.updateProfile(req as AuthenticatedRequest, res);
  } catch (error) {
    console.error("Error processing profile update request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/match", (req: Request, res: Response) =>
  profileController.getMatchProfile(req as AuthenticatedRequest, res)
);

// Device registration for push notifications
router.post("/register-device", (req: Request, res: Response) =>
  profileController.registerDevice(req as AuthenticatedRequest, res)
);

// Premium features
router.post("/premium/upgrade", (req: Request, res: Response) =>
  profileController.upgradeToPremium(req as AuthenticatedRequest, res)
);

export default router;
