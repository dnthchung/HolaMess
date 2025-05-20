import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  deviceInfo: string;
  lastActive: Date;
  createdAt: Date;
}

const SessionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  deviceInfo: {
    type: String,
    default: 'Unknown Device',
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
SessionSchema.index({ userId: 1, lastActive: -1 });

export default mongoose.model<ISession>('Session', SessionSchema);
