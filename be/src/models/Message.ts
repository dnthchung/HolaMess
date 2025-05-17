import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  sender: string;      // Tên hoặc ID người gửi
  receiver: string;    // Tên hoặc ID người nhận
  content: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMessage>("Message", MessageSchema);
