// src/socket/handlers.ts
import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import Session from "../models/Session";
import jwt from "jsonwebtoken";
import config from "../config";
import { logger } from "../utils/logger";

// Types
interface PrivateMessageData {
  sender: string;
  receiver: string;
  content: string;
}

interface OnlineUsers {
  [userId: string]: Set<string>; // Maps userId to a set of socketIds (multiple devices)
}

interface SocketWithAuth extends Socket {
  userId?: string;
  deviceInfo?: string;
  token?: string; // Store the token for later validation
}

// Helper function to verify token validity
async function verifyTokenValidity(token: string): Promise<boolean> {
  try {
    // Verify JWT token
    jwt.verify(token, config.JWT_SECRET as jwt.Secret);

    // Check if session exists
    const session = await Session.findOne({ token });
    if (!session) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

// Middleware to authenticate socket operations
async function authenticateSocketOperation(
  socket: SocketWithAuth
): Promise<boolean> {
  if (!socket.token) {
    logger.warn(
      `Socket operation authentication failed - No token for socket ${socket.id}`
    );
    socket.emit("auth_error", { message: "Authentication required" });
    return false;
  }

  const isValid = await verifyTokenValidity(socket.token);
  if (!isValid) {
    logger.warn(
      `Socket operation authentication failed - Invalid token for socket ${socket.id}`
    );
    socket.emit("auth_error", { message: "Token expired" });
    socket.disconnect(true);
    return false;
  }

  return true;
}

const setupSocketHandlers = (io: Server) => {
  // Keep track of online users across multiple devices
  const onlineUsers: OnlineUsers = {};
  // Map to associate tokens with sockets for periodic validation
  const socketTokens: Map<string, string> = new Map();

  // Helper function to notify a user's other devices
  function notifyUserDevices(
    userId: string,
    excludeSocketId: string,
    eventName: string,
    data: any
  ) {
    if (onlineUsers[userId]) {
      onlineUsers[userId].forEach((socketId) => {
        if (socketId !== excludeSocketId) {
          io.to(socketId).emit(eventName, data);
        }
      });
    }
  }

  // Set up periodic token validation (every 5 minutes)
  setInterval(async () => {
    const socketIds = Array.from(socketTokens.keys());
    logger.info(
      `Running periodic token validation for ${socketIds.length} sockets`
    );

    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId) as
        | SocketWithAuth
        | undefined;
      if (socket) {
        const token = socketTokens.get(socketId);
        if (token) {
          const isValid = await verifyTokenValidity(token);
          if (!isValid) {
            logger.warn(`Token expired for socket ${socketId}, disconnecting`);
            socket.emit("token_expired", {
              message: "Your session has expired, please re-authenticate",
            });
            socket.disconnect(true);
          }
        }
      } else {
        // Socket no longer exists, clean up our map
        socketTokens.delete(socketId);
      }
    }
  }, 5 * 60 * 1000); // every 5 minutes

  io.on("connection", (socket: SocketWithAuth) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Handle authentication
    socket.on("authenticate", async (token: string, callback) => {
      try {
        // Verify JWT token
        const decoded = jwt.verify(
          token,
          config.JWT_SECRET as jwt.Secret
        ) as any;
        const userId = decoded.id;

        // Check if session exists
        const session = await Session.findOne({ token });
        if (!session) {
          logger.warn(
            `Authentication failed - Invalid session for user ${userId}`
          );
          if (typeof callback === "function") {
            callback({ success: false, error: "Invalid session" });
          }
          return;
        }

        // Update session's last active time
        session.lastActive = new Date();
        await session.save();

        // Associate user ID and token with socket
        socket.userId = userId;
        socket.deviceInfo = session.deviceInfo;
        socket.token = token;

        // Store token for periodic validation
        socketTokens.set(socket.id, token);

        // Add the socket to the user's online sockets
        if (!onlineUsers[userId]) {
          onlineUsers[userId] = new Set();
        }
        onlineUsers[userId].add(socket.id);

        logger.info(
          `👤 User ${userId} authenticated with socket id ${socket.id} from ${session.deviceInfo}`
        );

        // Broadcast online status to other users
        io.emit("user_online", userId);

        // Notify the user's other devices that a new device connected
        notifyUserDevices(userId, socket.id, "device_connected", {
          deviceInfo: session.deviceInfo,
          socketId: socket.id,
        });

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        logger.error(`Authentication failed - JWT verification error`, err);
        if (typeof callback === "function") {
          callback({ success: false, error: "Invalid token" });
        }
      }
    });

    // Handle user joining (legacy, kept for compatibility)
    socket.on("join", (userId: string) => {
      socket.userId = userId;

      if (!onlineUsers[userId]) {
        onlineUsers[userId] = new Set();
      }
      onlineUsers[userId].add(socket.id);

      logger.info(
        `👤 Legacy join: User ${userId} connected with socket id ${socket.id}`
      );

      // Broadcast online status to other users
      io.emit("user_online", userId);
    });

    // Handle get online users request
    socket.on("get_online_users", (callback) => {
      const onlineUserIds = Object.keys(onlineUsers);
      callback(onlineUserIds);
    });

    // Handle private messages
    socket.on("private_message", async (data: PrivateMessageData, callback) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { sender, receiver, content } = data;

      // Validate message data
      if (!sender || !receiver || !content) {
        socket.emit("error_message", {
          error: "Thiếu thông tin gửi tin nhắn!",
        });
        return;
      }

      // Validate sender with socket.userId for security (if authenticated)
      if (socket.userId && socket.userId !== sender) {
        logger.warn(
          `Message sender mismatch: socket.userId=${socket.userId}, data.sender=${sender}`
        );
        socket.emit("error_message", {
          error: "Bạn không có quyền gửi tin nhắn với ID này!",
        });
        return;
      }

      try {
        // Save message to database
        const message = new Message({
          sender,
          receiver,
          content,
        });
        await message.save();

        const messageResponse = {
          _id: message._id,
          sender,
          receiver,
          content,
          createdAt: message.createdAt,
          read: false,
        };

        // Send to all receiver's devices if they're online
        if (onlineUsers[receiver]) {
          onlineUsers[receiver].forEach((socketId) => {
            io.to(socketId).emit("private_message", messageResponse);
          });
        }

        // Send confirmation to sender's other devices (multi-device sync)
        if (onlineUsers[sender]) {
          onlineUsers[sender].forEach((socketId) => {
            // Don't send to the original sender's socket
            if (socketId !== socket.id) {
              io.to(socketId).emit("private_message", messageResponse);
            }
          });
        }

        // Send confirmation to the original sender with acknowledgment
        if (typeof callback === "function") {
          callback(messageResponse);
        }
      } catch (err) {
        logger.error("Error saving message:", err);
        socket.emit("error_message", {
          error: "Không thể lưu tin nhắn.",
        });
      }
    });

    // Handle typing indicators
    socket.on(
      "typing",
      async ({ sender, receiver }: { sender: string; receiver: string }) => {
        // Verify token validity first
        if (!(await authenticateSocketOperation(socket))) return;

        // Send typing indicator to all receiver's devices
        if (onlineUsers[receiver]) {
          onlineUsers[receiver].forEach((socketId) => {
            io.to(socketId).emit("typing", { sender });
          });
        }
      }
    );

    // Handle read receipts
    socket.on(
      "mark_read",
      async ({
        userId,
        otherUserId,
      }: {
        userId: string;
        otherUserId: string;
      }) => {
        // Verify token validity first
        if (!(await authenticateSocketOperation(socket))) return;

        try {
          // Update messages as read
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

          logger.info(`Marked messages as read via socket`, {
            userId,
            otherUserId,
            updatedCount: result.modifiedCount,
          });

          // Notify the user's other devices about read status change
          if (result.modifiedCount > 0 && socket.userId === userId) {
            notifyUserDevices(userId, socket.id, "messages_read", {
              otherUserId,
            });
          }

          // Notify the sender that their messages were read
          if (onlineUsers[otherUserId] && result.modifiedCount > 0) {
            onlineUsers[otherUserId].forEach((socketId) => {
              io.to(socketId).emit("receipt_read", { userId, otherUserId });
            });
          }
        } catch (err) {
          logger.error("Error marking messages as read via socket:", err);
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = socket.userId;

      // Remove token from our validation map
      socketTokens.delete(socket.id);

      if (userId && onlineUsers[userId]) {
        // Remove this socket from the user's set
        onlineUsers[userId].delete(socket.id);

        // If user has no more connected sockets, remove from online users
        if (onlineUsers[userId].size === 0) {
          delete onlineUsers[userId];

          // Broadcast offline status to other users
          io.emit("user_offline", userId);
          logger.info(`👋 User ${userId} disconnected (all devices)`);
        } else {
          // Notify user's other devices that this device disconnected
          notifyUserDevices(userId, socket.id, "device_disconnected", {
            deviceInfo: socket.deviceInfo || "Unknown Device",
            socketId: socket.id,
          });

          logger.info(
            `👋 User ${userId} disconnected device ${socket.id}, still online on ${onlineUsers[userId].size} device(s)`
          );
        }
      }
    });
  });

  return { setSocketInstance: (newIo: Server) => (io = newIo) };
};

export default setupSocketHandlers;
