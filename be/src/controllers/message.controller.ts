import { Request, Response, RequestHandler } from "express"; // Import RequestHandler
import Message from "../models/Message";
import mongoose from "mongoose";
import { logger } from '../utils/logger'; // Import logger
import { AuthRequest } from "../utils/authMiddleware";
import Session from "../models/Session";
import { Server } from "socket.io";

// Global socket io instance reference, will be set from server.ts
let io: Server;

// Initialize the socket reference
export const setSocketInstance = (socketIo: Server) => {
  io = socketIo;
};

// Get conversation between two users - Áp dụng RequestHandler và xử lý req.params + Logger
export const getConversation: RequestHandler = async (req: AuthRequest, res) => {
  try {
    // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId, otherUserId } = req.params as { userId: string, otherUserId: string };
    logger.info('Fetching conversation', { userId, otherUserId }); // Log thông tin

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(otherUserId)) {
      logger.warn('Get conversation failed - Invalid user IDs', { userId, otherUserId }); // Log cảnh báo
      res.status(400).json({ error: "Invalid user IDs" });
      return;
    }

    // Find messages ...
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100);

    logger.info('Successfully fetched conversation', { userId, otherUserId, messageCount: messages.length }); // Log thông tin thành công
    res.json(messages);
  } catch (error) {
    // Log lỗi server với logger.error
    logger.error("Error fetching conversation", error, { userId: req.params.userId, otherUserId: req.params.otherUserId });
    res.status(500).json({ error: "Server error" });
  }
};

// Mark messages as read - Áp dụng RequestHandler và xử lý req.params + Logger
export const markAsRead: RequestHandler = async (req: AuthRequest, res) => {
  try {
    // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId, otherUserId } = req.params as { userId: string, otherUserId: string };
    logger.info('Attempting to mark messages as read', { fromUser: otherUserId, toUser: userId }); // Log thông tin

    // Update all unread messages ...
    const result = await Message.updateMany( // Có thể log kết quả updateMany
      {
        sender: otherUserId,
        receiver: userId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    // Notify other devices of the same user about read status change
    if (result.modifiedCount > 0) {
      notifyUserSessions(userId, 'messages_read', { otherUserId });
    }

    logger.info('Successfully marked messages as read', { fromUser: otherUserId, toUser: userId, updatedCount: result.modifiedCount }); // Log thông tin thành công
    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    // Log lỗi server với logger.error
    logger.error("Error marking messages as read", error, { userId: req.params.userId, otherUserId: req.params.otherUserId });
    res.status(500).json({ error: "Server error" });
  }
};

// Mark messages as read when focusing on input
export const markAsReadOnFocus: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { userId, otherUserId } = req.params as { userId: string, otherUserId: string };
    logger.info('Attempting to mark messages as read on focus', { fromUser: otherUserId, toUser: userId });

    // Update all unread messages
    const result = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: userId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    // Notify other devices of the same user about read status change
    if (result.modifiedCount > 0) {
      notifyUserSessions(userId, 'messages_read', { otherUserId });
    }

    logger.info('Successfully marked messages as read on focus', {
      fromUser: otherUserId,
      toUser: userId,
      updatedCount: result.modifiedCount
    });

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    logger.error("Error marking messages as read on focus", error, {
      userId: req.params.userId,
      otherUserId: req.params.otherUserId
    });
    res.status(500).json({ error: "Server error" });
  }
};

// Get user's recent conversations - Áp dụng RequestHandler và xử lý req.params + Logger
export const getRecentConversations: RequestHandler = async (req: AuthRequest, res) => {
  try {
    // Thêm as string để làm rõ kiểu dữ liệu từ params
    const { userId } = req.params as { userId: string };
    logger.info('Fetching recent conversations for user', { userId }); // Log thông tin

    // Aggregate ...
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { receiver: new mongoose.Types.ObjectId(userId) }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          // Sử dụng _id nhất quán với Mongoose thay vì id
          _id: {
            $cond: {
              if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
              then: "$receiver",
              else: "$sender",
            },
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$read", false] }
                ]},
                1,
                0
              ]
            }
          }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id", // Sử dụng _id
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          unreadCount: 1,
          "userInfo.name": 1,
          "userInfo.phone": 1,
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    logger.info('Successfully fetched recent conversations', { userId, conversationCount: conversations.length }); // Log thông tin thành công
    res.json(conversations);
  } catch (error) {
    // Log lỗi server với logger.error
    logger.error("Error fetching recent conversations", error, { userId: req.params.userId });
    res.status(500).json({ error: "Server error" });
  }
};

// Helper function to notify other sessions of the same user
async function notifyUserSessions(userId: string, eventName: string, data: any) {
  if (!io) {
    logger.warn('Socket.io instance not available for notification');
    return;
  }

  try {
    // Get all active sessions for this user
    const sessions = await Session.find({ userId });

    // Get the socket IDs associated with these sessions from the socket connections
    const socketIds = Object.entries(io.sockets.sockets)
      .filter(([_, socket]) => {
        const userIdFromSocket = (socket as any).userId;
        return userIdFromSocket === userId;
      })
      .map(([socketId]) => socketId);

    if (socketIds.length > 0) {
      logger.info('Notifying user sessions', { userId, eventName, socketIds });

      // Emit the event to all connected sockets for this user
      socketIds.forEach(socketId => {
        io.to(socketId).emit(eventName, data);
      });
    }
  } catch (error) {
    logger.error('Error notifying user sessions', error, { userId, eventName });
  }
}
