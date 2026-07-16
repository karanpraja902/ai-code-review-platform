import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import mongoose from "mongoose";

export const getPrData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    console.log("🔄 Getting PR data: ", id);

    let data = null as any;
    try {
      data = await mongoose.connection.db?.collection('pull_request_datas').findOne({ _id: new mongoose.Types.ObjectId(id) });
      // console.log("🔄 Doc: ", doc);
    } catch (_) {
      // ignore cast errors
    }

    if (!data) {
      return next(new CustomError("PR data not found", 404));
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error fetching PR data:", error);
    next(new CustomError(error.message || "Failed to fetch PR data", 500));
  }
}

export const getExtensionData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError("Invalid extension data ID", 400));
    }
    const data = await mongoose.connection.db
      ?.collection("extension_datas")
      .findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!data) {
      return next(new CustomError("Extension data not found", 404));
    }
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    next(new CustomError(error.message || "Failed to fetch extension data", 500));
  }
};
