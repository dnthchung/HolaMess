// src/socket/handlers.ts
import { Server, Socket } from "socket.io";
import Message from "../models/Message";

// Types
interface PrivateMessageData {
  sender: string;
  receiver: string;
  content: string;
}

interface OnlineUsers {
  [userId: string]: string; // Maps userId to socketId
}

const setupSocketHandlers = (io: Server) => {
  // Keep track of online users
  const onlineUsers: OnlineUsers = {};

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle user joining
    socket.on("join", (userId: string) => {
      onlineUsers[userId] = socket.id;
      console.log(`👤 User ${userId} connected with socket id ${socket.id}`);
      
      // Broadcast online status to other users if needed
      // io.emit("user_online", userId);
    });

    // Handle private messages
    socket.on("private_message", async (data: PrivateMessageData) => {
      const { sender, receiver, content } = data;
      
      // Validate message data
      if (!sender || !receiver || !content) {
        socket.emit("error_message", { 
          error: "Thiếu thông tin gửi tin nhắn!" 
        });
        return;
      }
      
      try {
        // Save message to database
        const message = new Message({ 
          sender, 
          receiver, 
          content 
        });
        await message.save();
        
        const messageResponse = {
          _id: message._id,
          sender,
          content,
          createdAt: message.createdAt,
        };
        
        // Send to receiver if they're online
        const receiverSocketId = onlineUsers[receiver];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("private_message", messageResponse);
        }
        
        // Send confirmation to sender
        socket.emit("private_message", messageResponse);
        
      } catch (err) {
        console.error("Error saving message:", err);
        socket.emit("error_message", { 
          error: "Không thể lưu tin nhắn." 
        });
      }
    });

    // Handle typing indicators (optional feature)
    socket.on("typing", ({ sender, receiver }: { sender: string, receiver: string }) => {
      const receiverSocketId = onlineUsers[receiver];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { sender });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = Object.keys(onlineUsers).find(
        (key) => onlineUsers[key] === socket.id
      );
      
      if (userId) {
        console.log(`👋 User ${userId} disconnected`);
        delete onlineUsers[userId];
        
        // Broadcast offline status to other users if needed
        // io.emit("user_offline", userId);
      }
    });
  });
};

export default setupSocketHandlers;