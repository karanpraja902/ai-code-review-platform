import mongoose, { Document, Schema } from 'mongoose';

export interface IExtensionData extends Document {
  repository: {
    name: string;
    fullName: string;
    owner: string;
    url: string;
  };
  branches: {
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
  changes: {
    summary: {
      files: number;
      additions: number;
      deletions: number;
    };
    commits: Array<{
      sha: string;
      message: string;
      author: {
        name: string;
        email: string;
      };
      date: string;
    }>;
    files: Array<{
      filename: string;
      status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'changed' | 'unchanged';
      additions: number;
      deletions: number;
      patch: string;
    }>;
    fullDiff: string;
  };
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExtensionDataSchema = new Schema<IExtensionData>(
  {
    repository: {
      name: { type: String, required: true },
      fullName: { type: String },
      owner: { type: String },
      url: { type: String },
    },
    branches: {
      head: {
        ref: { type: String },
        sha: { type: String },
      },
      base: {
        ref: { type: String },
        sha: { type: String },
      },
    },
    changes: {
      summary: {
        files: { type: Number, required: true },
        additions: { type: Number, required: true },
        deletions: { type: Number, required: true },
      },
      commits: [
        {
          sha: { type: String },
          message: { type: String },
          author: {
            name: { type: String },
            email: { type: String },
          },
          date: { type: String },
        },
      ],
      files: [
        {
          filename: { type: String, required: true },
          status: { 
            type: String, 
            enum: ['modified', 'added', 'deleted', 'renamed', 'copied', 'changed', 'unchanged'],
            required: true 
          },
          additions: { type: Number, required: true },
          deletions: { type: Number, required: true },
          patch: { type: String },
        }
      ],
      fullDiff: { type: String, required: true },
    },
    feedback: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ExtensionData || mongoose.model<IExtensionData>('ExtensionData', ExtensionDataSchema, 'extension_datas');
