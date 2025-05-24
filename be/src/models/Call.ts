import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  _id: string; // Use string instead of ObjectId
  caller: string; // User ID who initiated the call
  callee: string; // User ID who received the call
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number; // Duration in seconds
  createdAt: Date;
  updatedAt: Date;
  calculateDuration(): number; // Add method to interface
}

const CallSchema: Schema = new Schema({
  _id: {
    type: String, // Change to String
    required: true
  },
  caller: {
    type: String,
    required: true,
    ref: 'User'
  },
  callee: {
    type: String,
    required: true,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['calling', 'ringing', 'connected', 'ended', 'declined', 'missed', 'failed'],
    default: 'calling'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  }
}, {
  timestamps: true, // This will add createdAt and updatedAt automatically
  _id: false // Disable automatic ObjectId generation
});

// Add indexes for better query performance
CallSchema.index({ caller: 1, callee: 1 });
CallSchema.index({ createdAt: -1 });
CallSchema.index({ caller: 1, createdAt: -1 });
CallSchema.index({ callee: 1, createdAt: -1 });

// Method to calculate duration when call ends
CallSchema.methods.calculateDuration = function(): number {
  if (this.endTime && this.startTime) {
    return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  return 0;
};

// Pre-save middleware to calculate duration
CallSchema.pre('save', function(this: ICall, next) {
  if (this.endTime && this.startTime && !this.duration) {
    this.duration = this.calculateDuration();
  }
  next();
});

const Call = mongoose.model<ICall>('Call', CallSchema);

export default Call;
