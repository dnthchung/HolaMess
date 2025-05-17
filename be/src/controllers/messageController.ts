import { Request, Response } from "express";
import Message from "../models/Message";

export const getMessageHistory = async (req: Request, res: Response) => {
  const userId = req.user.id; // middleware xác thực JWT sẽ set req.user
  const { partnerId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
