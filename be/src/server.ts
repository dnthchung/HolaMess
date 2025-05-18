// src/server.ts - Fixed router implementations
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Routes
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";

// Models
import Message from "./models/Message";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new SocketIOServer(server, { 
  cors: { 
    origin: "*" 
  } 
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chat_demo";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// SocketIO: quản lý user online
const onlineUsers: { [userId: string]: string } = {};

io.on("connection", (socket) => {
  socket.on("join", (userId: string) => {
    onlineUsers[userId] = socket.id;
    console.log(`${userId} connected with socket id ${socket.id}`);
  });

  socket.on("private_message", async (data) => {
    const { sender, receiver, content } = data;
    if (!sender || !receiver || !content) {
      socket.emit("error_message", { error: "Thiếu thông tin gửi tin nhắn!" });
      return;
    }

    try {
      const message = new Message({ sender, receiver, content });
      await message.save();

      // Gửi realtime cho người nhận nếu họ online
      const receiverSocketId = onlineUsers[receiver];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          sender,
          content,
          createdAt: message.createdAt,
        });
      }

      // Gửi lại cho sender để UI cập nhật
      socket.emit("private_message", {
        sender,
        content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      socket.emit("error_message", { error: "Không thể lưu tin nhắn." });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, sId] of Object.entries(onlineUsers)) {
      if (sId === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
  });
});

// REST API - Fixed router implementations
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});