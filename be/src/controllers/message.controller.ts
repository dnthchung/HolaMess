import { Request, Response, RequestHandler } from "express"; // Import RequestHandler
import Message from "../models/Message";
import mongoose from "mongoose";

// Get conversation between two users - Áp dụng RequestHandler và xử lý req.params
export const getConversation: RequestHandler = async (req, res) => { // Thêm : RequestHandler
  try {
    // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId, otherUserId } = req.params as { userId: string, otherUserId: string };

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ error: "Invalid user IDs" });
      return; // Thêm return sau khi gửi response
    }

    // Find messages where sender is userId and receiver is otherUserId
    // OR sender is otherUserId and receiver is userId
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 }) // Sort by creation time ascending
      .limit(100);          // Limit number of messages retrieved

    res.json(messages);
    // Không cần return
  } catch (error) {
    console.error("Error fetching conversation:", error); // Nên log lỗi
    res.status(500).json({ error: "Server error" });
    // Không cần return
  }
};

// Mark messages as read - Áp dụng RequestHandler và xử lý req.params
export const markAsRead: RequestHandler = async (req, res) => { // Thêm : RequestHandler
  try {
    // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId, otherUserId } = req.params as { userId: string, otherUserId: string };

    // Update all unread messages from otherUserId to userId
    await Message.updateMany(
      {
        sender: otherUserId, // Sử dụng giá trị đã ép kiểu
        receiver: userId,   // Sử dụng giá trị đã ép kiểu
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    res.json({ success: true });
    // Không cần return
  } catch (error) {
    console.error("Error marking messages as read:", error); // Nên log lỗi
    res.status(500).json({ error: "Server error" });
    // Không cần return
  }
};

// Get user's recent conversations - Áp dụng RequestHandler và xử lý req.params
export const getRecentConversations: RequestHandler = async (req, res) => { // Thêm : RequestHandler
  try {
     // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId } = req.params as { userId: string };

    // Aggregate to find the most recent message with each user
    // Sử dụng new mongoose.Types.ObjectId(userId) vẫn hoạt động tốt nếu userId là string hợp lệ
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
              then: "$receiver",
              else: "$sender",
            },
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          "userInfo.name": 1,
          "userInfo.phone": 1,
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    res.json(conversations);
    // Không cần return
  } catch (error) {
    console.error("Error fetching recent conversations:", error); // Nên log lỗi
    res.status(500).json({ error: "Server error" });
    // Không cần return
  }
};