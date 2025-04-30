import express from "express";
import profileRoutes from "./profile.routes";
import chatRoutes from "./chat.routes";
import connectRoutes from "./connect.route";
const router = express.Router();

router.use("/profile", profileRoutes);
router.use("/chat", chatRoutes);
router.use("/connect", connectRoutes);

export default router;
