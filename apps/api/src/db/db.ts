import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const MONGODB_URI = process.env.AI_CODE_REVIEW_DB;

const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error("AI_CODE_REVIEW_DB environment variable is not set");
        }
        await mongoose.connect(MONGODB_URI);
        const authTokens = mongoose.connection.db?.collection("auth_tokens");
        if (authTokens) {
            const configuredToken = process.env.SANDBOX_AUTH_TOKEN;
            if (configuredToken) {
                await authTokens.updateOne(
                    { type: "sandbox" },
                    { $set: { auth_token: configuredToken, updated_at: new Date() } },
                    { upsert: true },
                );
            } else {
                await authTokens.updateOne(
                    { type: "sandbox" },
                    {
                        $setOnInsert: {
                            auth_token: randomBytes(32).toString("hex"),
                            created_at: new Date(),
                        },
                        $set: { updated_at: new Date() },
                    },
                    { upsert: true },
                );
            }
        }
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;
