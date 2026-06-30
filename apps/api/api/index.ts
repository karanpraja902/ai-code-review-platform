import { createApp } from "../src/app.js";
import connectDB from "../src/db/db.js";
import { logger } from "../src/utils/logger.js";

const app = createApp();

let connectPromise: Promise<void> | null = null;

async function ensureDatabase() {
  if (!connectPromise) {
    connectPromise = connectDB().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  await connectPromise;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (error) {
    logger.error("API bootstrap failed", { error });
    return res.status(500).json({
      status: "error",
      message: "API bootstrap failed",
    });
  }
}
