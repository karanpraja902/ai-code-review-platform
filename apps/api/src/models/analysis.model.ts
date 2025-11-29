import mongoose, { Schema } from 'mongoose';

export interface IAnalysis {
  _id: mongoose.Types.ObjectId;
  analysis_type: 'full_repo_analysis' | 'pr_analysis';
  userId: string;
  repoUrl: string;
  github_repositoryId: Schema.Types.ObjectId;
  sandboxId: string;
  model: string;
  prompt: string;
  status: 'draft' | 'running' | 'completed' | 'interrupted' | 'error';
  // PR-specific fields (only present for 'pr_analysis')
  pr_number?: number;
  pr_url?: string;
  pr_title?: string;
  // Total number of PR comments posted during this analysis
  pr_comments_posted?: number;
  // Options field only for PR review context
  options?: Record<string, any>;
  exitCode?: number | null;
  logsCompressed?: Buffer;
  compression?: {
    algorithm: 'gzip';
    originalBytes: number;
    compressedBytes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    analysis_type: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    repoUrl: { type: String, required: true },
    github_repositoryId: { type: Schema.Types.ObjectId, ref: 'Github_Repository', index: true },
    sandboxId: { type: String },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'running', 'completed', 'interrupted', 'error'],
      required: true,
    },
    // Optional PR-specific fields
    pr_number: { type: Number },
    pr_url: { type: String },
    pr_title: { type: String },
    pr_comments_posted: { type: Number, default: 0 },
    // Options field used only for PR review context
    options: { type: Schema.Types.Mixed },
    exitCode: { type: Number },
    logsCompressed: { type: Buffer },
    compression: {
      algorithm: { type: String, enum: ['gzip'] },
      originalBytes: { type: Number },
      compressedBytes: { type: Number },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
