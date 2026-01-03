// apps/api/src/models/team.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: { type: String, required: true, index: true },
    settings: {
      type: Schema.Types.Mixed,
      default: {
        commentSeverity: 1,
        defaultModelRepo: new mongoose.Types.ObjectId('6916caa7984764bbefcf67d9'),
        defaultModelPr: new mongoose.Types.ObjectId('6916caa7984764bbefcf67dc'),
        defaultModelExtension: new mongoose.Types.ObjectId('6916caa7984764bbefcf67dc'),
        prSummarySettings: {
          enabled: true,
          sequenceDiagram: true,
          issueTables: true,
          impactAsessment: true,
          vibeCheckRap: false,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
