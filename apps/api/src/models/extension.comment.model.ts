import mongoose, { Document, Schema } from 'mongoose';

export interface IExtensionComment extends Document {
  extension_data_id: Schema.Types.ObjectId;
  user_id: string;
  file_path: string;
  line_start: number;
  line_end: number;
  severity: string;
  confidence: string;
  content: string;
  fetched: boolean;
  fetched_at?: Date;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExtensionCommentSchema = new Schema<IExtensionComment>(
  {
    extension_data_id: {
      type: Schema.Types.ObjectId,
      ref: 'ExtensionData',
      required: true,
      index: true
    },
    title: {
      type: String,
    },
    user_id: {
      type: String,
      required: true,
      index: true
    },
    file_path: {
      type: String,
      required: true
    },
    line_start: {
      type: Number,
      required: true
    },
    line_end: {
      type: Number,
      required: true
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium'
    },
    confidence: {
      type: String,
      default: '3/5'
    },
    content: {
      type: String,
      required: true
    },
    fetched: {
      type: Boolean,
      default: false,
      index: true
    },
    fetched_at: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient polling queries
ExtensionCommentSchema.index({ extension_data_id: 1, fetched: 1 });

// TTL index - auto-delete comments after 7 days
const COMMENT_TTL_DAYS = parseInt(process.env.COMMENT_TTL_DAYS || '7', 10);
const COMMENT_TTL_SECONDS = COMMENT_TTL_DAYS * 24 * 60 * 60;

ExtensionCommentSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: COMMENT_TTL_SECONDS }
);

export default mongoose.models.ExtensionComment || 
  mongoose.model<IExtensionComment>('ExtensionComment', ExtensionCommentSchema);
