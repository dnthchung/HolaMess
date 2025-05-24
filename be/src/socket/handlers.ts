// src/socket/handlers.ts
import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import Session from "../models/Session";
import Call from "../models/Call";
import jwt from "jsonwebtoken";
import config from "../config";
import { logger } from "../utils/logger";

// Types
interface PrivateMessageData {
  sender: string;
  receiver: string;
  content: string;
  messageType?: 'text' | 'voice_call';
  callData?: {
    duration: number;
    startTime: string;
    endTime: string;
    status: 'completed' | 'missed' | 'declined';
  };
}

// Voice Call Types
interface CallOfferData {
  callId: string;
  callee: string;
  offer: RTCSessionDescriptionInit;
}

interface CallAnswerData {
  callId: string;
  answer: RTCSessionDescriptionInit;
}

interface CallIceCandidateData {
  callId: string;
  candidate: RTCIceCandidateInit;
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

    // ===== VOICE CALL HANDLERS =====

    // Handle call initiation
    socket.on("call_offer", async (data: CallOfferData, callback) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { callId, callee, offer } = data;

      // Get caller from authenticated socket (more secure)
      const caller = socket.userId;

      if (!caller) {
        logger.warn(`Call offer failed - No authenticated user for socket ${socket.id}`);
        socket.emit("call_error", { error: "Authentication required" });
        return;
      }

      try {
        // Create call record in database
        const call = new Call({
          _id: callId,
          caller,
          callee,
          status: 'calling',
          startTime: new Date()
        });
        await call.save();

        logger.info(`📞 Call initiated: ${caller} -> ${callee} (${callId})`);

        // Send call offer to all callee's devices
        if (onlineUsers[callee]) {
          const callOfferData = {
            callId,
            caller,
            callee,
            offer,
            timestamp: new Date().toISOString()
          };

          onlineUsers[callee].forEach((socketId) => {
            io.to(socketId).emit("incoming_call", callOfferData);
          });

          // Update call status to ringing
          call.status = 'ringing';
          await call.save();

          // Notify caller's other devices about outgoing call
          notifyUserDevices(caller, socket.id, "outgoing_call", callOfferData);

          if (typeof callback === "function") {
            callback({ success: true, callId });
          }
        } else {
          // Callee is offline
          call.status = 'missed';
          call.endTime = new Date();
          await call.save();

          logger.info(`📞 Call missed (user offline): ${caller} -> ${callee} (${callId})`);

          if (typeof callback === "function") {
            callback({ success: false, error: "User is offline" });
          }
        }
      } catch (err) {
        logger.error("Error handling call offer:", err);
        socket.emit("call_error", { error: "Failed to initiate call" });
      }
    });

    // Handle call answer
    socket.on("call_answer", async (data: CallAnswerData, callback) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { callId, answer } = data;

      try {
        // Find and update call record
        const call = await Call.findById(callId);
        if (!call) {
          socket.emit("call_error", { error: "Call not found" });
          return;
        }

        // Verify user is the callee
        if (socket.userId !== call.callee) {
          socket.emit("call_error", { error: "Unauthorized call answer" });
          return;
        }

        // Update call status to connected
        call.status = 'connected';
        await call.save();

        logger.info(`📞 Call answered: ${call.caller} <-> ${call.callee} (${callId})`);

        // Send answer to all caller's devices
        const callAnswerData = {
          callId,
          answer,
          timestamp: new Date().toISOString()
        };

        if (onlineUsers[call.caller]) {
          onlineUsers[call.caller].forEach((socketId) => {
            io.to(socketId).emit("call_answered", callAnswerData);
          });
        }

        // Notify callee's other devices that call was answered
        notifyUserDevices(call.callee, socket.id, "call_answered_elsewhere", { callId });

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        logger.error("Error handling call answer:", err);
        socket.emit("call_error", { error: "Failed to answer call" });
      }
    });

    // Handle ICE candidates
    socket.on("call_ice_candidate", async (data: CallIceCandidateData) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { callId, candidate } = data;

      try {
        // Find call record to get participants
        const call = await Call.findById(callId);
        if (!call) {
          socket.emit("call_error", { error: "Call not found" });
          return;
        }

        // Verify user is part of the call
        if (socket.userId !== call.caller && socket.userId !== call.callee) {
          socket.emit("call_error", { error: "Unauthorized ICE candidate" });
          return;
        }

        // Determine the other participant
        const otherUserId = socket.userId === call.caller ? call.callee : call.caller;

        const iceCandidateData = {
          callId,
          candidate,
          timestamp: new Date().toISOString()
        };

        // Forward ICE candidate to the other participant's devices
        if (onlineUsers[otherUserId]) {
          onlineUsers[otherUserId].forEach((socketId) => {
            io.to(socketId).emit("call_ice_candidate", iceCandidateData);
          });
        }

        logger.debug(`📞 ICE candidate forwarded for call ${callId}`);
      } catch (err) {
        logger.error("Error handling ICE candidate:", err);
      }
    });

    // Handle call end
    socket.on("call_end", async (data: { callId: string }, callback) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { callId } = data;
      const endedBy = socket.userId;

      if (!endedBy) {
        logger.warn(`Call end failed - No authenticated user for socket ${socket.id}`);
        socket.emit("call_error", { error: "Authentication required" });
        return;
      }

      try {
        // Find and update call record
        const call = await Call.findById(callId);
        if (!call) {
          socket.emit("call_error", { error: "Call not found" });
          return;
        }

        // Verify user is part of the call
        if (endedBy !== call.caller && endedBy !== call.callee) {
          socket.emit("call_error", { error: "Unauthorized call end" });
          return;
        }

        // Update call record
        call.status = 'ended';
        call.endTime = new Date();
        const duration = call.calculateDuration();
        call.duration = duration;
        await call.save();

        logger.info(`📞 Call ended: ${call.caller} <-> ${call.callee} (${callId}) - Duration: ${duration}s`);

        // Determine the other participant
        const otherUserId = call.caller === endedBy ? call.callee : call.caller;

        const callEndData = {
          callId,
          endedBy,
          duration,
          timestamp: new Date().toISOString()
        };

        // Notify the other participant's devices
        if (onlineUsers[otherUserId]) {
          onlineUsers[otherUserId].forEach((socketId) => {
            io.to(socketId).emit("call_ended", callEndData);
          });
        }

        // Notify sender's other devices
        notifyUserDevices(endedBy, socket.id, "call_ended", callEndData);

        // Create call history message for both participants
        if (duration > 0) {
          const callMessage = {
            sender: call.caller,
            receiver: call.callee,
            content: "Cuộc gọi thoại",
            messageType: 'voice_call',
            callData: {
              duration,
              startTime: call.startTime.toISOString(),
              endTime: call.endTime!.toISOString(),
              status: 'completed'
            }
          };

          // Save call message to database
          const message = new Message(callMessage);
          await message.save();

          // Send call message to both participants
          const messageResponse = {
            _id: message._id,
            ...callMessage,
            createdAt: message.createdAt,
            read: false
          };

          // Send to caller's devices
          if (onlineUsers[call.caller]) {
            onlineUsers[call.caller].forEach((socketId) => {
              io.to(socketId).emit("private_message", messageResponse);
            });
          }

          // Send to callee's devices
          if (onlineUsers[call.callee]) {
            onlineUsers[call.callee].forEach((socketId) => {
              io.to(socketId).emit("private_message", messageResponse);
            });
          }
        }

        if (typeof callback === "function") {
          callback({ success: true, duration });
        }
      } catch (err) {
        logger.error("Error handling call end:", err);
        socket.emit("call_error", { error: "Failed to end call" });
      }
    });

    // Handle call decline
    socket.on("call_decline", async (data: { callId: string }, callback) => {
      // Verify token validity first
      if (!(await authenticateSocketOperation(socket))) return;

      const { callId } = data;

      try {
        // Find and update call record
        const call = await Call.findById(callId);
        if (!call) {
          socket.emit("call_error", { error: "Call not found" });
          return;
        }

        // Verify user is the callee
        if (socket.userId !== call.callee) {
          socket.emit("call_error", { error: "Unauthorized call decline" });
          return;
        }

        // Update call status to declined
        call.status = 'declined';
        call.endTime = new Date();
        await call.save();

        logger.info(`📞 Call declined: ${call.caller} -> ${call.callee} (${callId})`);

        const callDeclineData = {
          callId,
          declinedBy: call.callee,
          timestamp: new Date().toISOString()
        };

        // Notify caller's devices
        if (onlineUsers[call.caller]) {
          onlineUsers[call.caller].forEach((socketId) => {
            io.to(socketId).emit("call_declined", callDeclineData);
          });
        }

        // Notify callee's other devices
        notifyUserDevices(call.callee, socket.id, "call_declined_elsewhere", { callId });

        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (err) {
        logger.error("Error handling call decline:", err);
        socket.emit("call_error", { error: "Failed to decline call" });
      }
    });

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
