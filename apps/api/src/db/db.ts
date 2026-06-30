import mongoose from "mongoose";

const MONGODB_URI = process.env.AI_CODE_REVIEW_DB;

const connectDB = async () => {
    try {
        if (!MONGODB_URI) {
            throw new Error("AI_CODE_REVIEW_DB environment variable is not set");
        }
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        throw error;
    }
};

export default connectDB;
