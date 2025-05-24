// src/models/Message.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId | string;
  receiver: mongoose.Types.ObjectId | string;
  content: string;
  clientMessageId: string;
  read: boolean;
  messageType: 'text' | 'voice_call';
  callData?: {
    duration: number;
    startTime: Date;
    endTime: Date;
    status: 'completed' | 'missed' | 'declined';
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    messageType: {
      type: String,
      enum: ['text', 'voice_call'],
      default: 'text'
    },
    callData: {
      type: {
        duration: Number,
        startTime: Date,
        endTime: Date,
        status: {
          type: String,
          enum: ['completed', 'missed', 'declined']
        }
      },
      required: false
    }
  },
  { timestamps: true }
);

// Index for querying conversations
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ messageType: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
