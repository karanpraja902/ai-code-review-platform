// apps/api/src/models/team_invitation.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type InvitationRole = 'admin' | 'member';

export interface ITeamInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  teamId: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId?: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    inviterId: {
      type: String,
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    inviteeId: {
      type: String,
      index: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
      default: 'member',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      required: true,
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
TeamInvitationSchema.index({ teamId: 1, status: 1 });
TeamInvitationSchema.index({ inviteeEmail: 1, status: 1 });
TeamInvitationSchema.index({ inviteeId: 1, status: 1 });

// TTL index to auto-delete expired invitations after 30 days
TeamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.TeamInvitation || 
  mongoose.model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);
