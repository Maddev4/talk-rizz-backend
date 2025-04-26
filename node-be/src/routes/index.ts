import express from "express";
import profileRoutes from "./profile.routes";
import chatRoutes from "./chat.routes";

const router = express.Router();

router.use("/profile", profileRoutes);
router.use("/chat", chatRoutes);

export default router;
