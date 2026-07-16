import mongoose from "mongoose";
import { randomBytes } from "node:crypto";

const connectDB = async () => {
    try {
        const MONGODB_URI = process.env.AI_CODE_REVIEW_DB;
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

        // Authentication assigns every new user to the active free plan. A
        // fresh database must contain that plan before the first request, or
        // user creation and all authenticated dashboard routes fail.
        const subscriptionPlans = mongoose.connection.db?.collection("subscription_plans");
        if (subscriptionPlans) {
            await subscriptionPlans.updateOne(
                { name: "free" },
                {
                    $setOnInsert: {
                        displayName: "Free",
                        description: "Free plan for individual developers",
                        price: { monthly: 0, yearly: 0 },
                        features: {
                            maxTeams: 1,
                            maxTeamMembers: 1,
                            maxPrAnalysisPerDay: 5,
                            maxFullRepoAnalysisPerDay: 2,
                            prioritySupport: false,
                            organizationSupport: false,
                        },
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                },
                { upsert: true },
            );
        }
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;
