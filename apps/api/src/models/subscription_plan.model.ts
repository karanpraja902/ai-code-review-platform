import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: 'free' | 'lite' | 'advance' | 'custom';
  displayName: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    maxTeams: number;
    maxTeamMembers: number;
    maxPrAnalysisPerDay: number;
    maxFullRepoAnalysisPerDay: number;
    prioritySupport: boolean;
    organizationSupport: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: true,
      enum: ['free', 'lite', 'advance', 'custom'],
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      monthly: {
        type: Number,
        required: true,
        min: 0,
      },
      yearly: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    features: {
      maxTeams: {
        type: Number,
        required: true,
        min: 0,
      },
      maxTeamMembers: {
        type: Number,
        required: true,
        min: 0,
      },
      maxPrAnalysisPerDay: {
        type: Number,
        required: true,
        min: 0,
        default: 5,
      },
      maxFullRepoAnalysisPerDay: {
        type: Number,
        required: true,
        min: 0,
        default: 2,
      },
      prioritySupport: {
        type: Boolean,
        required: true,
        default: false,
      },
      organizationSupport: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ isActive: 1 });

export default mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlan>('Subscription_Plan', subscriptionPlanSchema);