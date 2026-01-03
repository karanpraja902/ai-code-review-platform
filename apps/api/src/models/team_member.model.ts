// apps/api/src/models/team_member.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export type TeamMemberRole = 'admin' | 'member';

export interface ITeamMember extends Document {
  _id: mongoose.Types.ObjectId;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: Date;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    invitedBy: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index - user can only be member of a team once
TeamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

// Index for finding all teams a user belongs to
TeamMemberSchema.index({ userId: 1 });

// Index for finding all members of a team
TeamMemberSchema.index({ teamId: 1 });

export default mongoose.models.TeamMember || 
  mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
