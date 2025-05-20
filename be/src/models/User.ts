// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  password: string; // Chưa hash, bản đơn giản
  name: string;
}


const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
});

export default mongoose.model<IUser>('User', UserSchema);

