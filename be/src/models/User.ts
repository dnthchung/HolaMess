// src/models/User.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  phone: string;
  password: string; // hash ở phiên bản thật
  name: string;
}

const UserSchema = new Schema<IUser>({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
});

export default mongoose.model<IUser>("User", UserSchema);
