import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { mailService } from "../services/mail/mail_service.js";
import { earlyAccessTemplate } from "../services/mail/mail_templates/index.js";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

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

    if (!user.email) {
      return res.status(400).json({ success: false, message: "User email not available" });
    }

    // Generate confirmation token
    user.earlyAccessRequestedAt = new Date();
    await user.save();

    const subject = "Early Access Requested - AI Code Review Platform";
   const html = earlyAccessTemplate({
      username: user.firstName || user.username || undefined,
      email: user.email,
    });

    try {
      await mailService.custom({
        to: "karanpraja902@gmail.com",
        subject,
        htmlContent: html,
      });
    } catch (error) {
      logger.error("Failed to send early access email", { error });
      // proceed even if email fails, since user flag is updated
    }

    return res.status(200).json({ success: true, message: "Early access email sent", data: { earlyAccessRequested: true } });
  } catch (error) {
    logger.error("Error handling early access request", { error });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
