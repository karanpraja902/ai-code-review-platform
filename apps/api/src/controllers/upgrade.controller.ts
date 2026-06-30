import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { mailService } from "../services/mail/mail_service.js";
import { baseTemplate } from "../services/mail/mail_templates/index.js";
import { logger } from "../utils/logger.js";

export const requestUpgrade = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { startupName, startupUrl, description } = req.body || {};

    if (!startupName || !startupUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields: startupName and startupUrl" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const subject = "Upgrade Plan Request - AI Code Review Platform";
    const requestedAt = new Date().toISOString();

    const html = baseTemplate(`
      <h2 style="margin: 0 0 12px 0;">New Upgrade Request</h2>
      <p style="margin: 0 0 16px 0; color: #4b5563;">A user has requested an organization plan upgrade.</p>

      <h3 style="margin: 0 0 8px 0;">User Details</h3>
      <ul style="list-style: none; padding: 0; margin: 0 0 16px 0;">
        <li><strong>Name:</strong> ${user.firstName || user.username || "Unknown"}</li>
        <li><strong>Email:</strong> ${user.email || "Unknown"}</li>
        <li><strong>User ID:</strong> ${user._id}</li>
      </ul>

      <h3 style="margin: 0 0 8px 0;">Startup Details</h3>
      <ul style="list-style: none; padding: 0; margin: 0 0 16px 0;">
        <li><strong>Startup Name:</strong> ${startupName}</li>
        <li><strong>Startup URL:</strong> ${startupUrl}</li>
        <li><strong>Description:</strong> ${description ? description : "N/A"}</li>
      </ul>

      <p style="margin: 0; color: #6b7280;">Requested at: ${requestedAt}</p>
    `);

    try {
      await mailService.custom({
        to: "karanpraja902@gmail.com",
        subject,
        htmlContent: html,
      });
    } catch (error) {
      logger.error("Failed to send upgrade request email", { error });
      // proceed even if email fails, since we can still flag the user request
    }

    user.requestedUpgrade = {
      status: true,
      startupName,
      startupUrl,
      description,
      requestedAt,
    };
    await user.save();

    return res.status(200).json({ success: true, message: "Upgrade request submitted", data: { requestedUpgrade: user.requestedUpgrade } });
  } catch (error) {
    logger.error("Error handling upgrade request", { error });
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
