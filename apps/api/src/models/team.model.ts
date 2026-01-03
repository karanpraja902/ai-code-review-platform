// apps/api/src/models/team.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  _id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
