import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { logger } from "../utils/logger.js";

export const requestEarlyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Grant early access directly instead of sending email
    user.earlyAccess = true;
    user.earlyAccessRequestedAt = new Date();
    await user.save();

    logger.info("Early access enabled for user", { userId });

    return res.status(200).json({ success: true, message: "Early access granted", data: { earlyAccess: true } });
  } catch (error) {
    logger.error("Error handling early access request", { error });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
