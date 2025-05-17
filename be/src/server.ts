import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import Message from "./models/Message";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// Kết nối MongoDB (sử dụng local hoặc Atlas)
mongoose.connect("mongodb://localhost:27017/chat_demo");

// Map userId <=> socketId
const onlineUsers: { [userId: string]: string } = {};

io.on("connection", (socket) => {
  // Nhận userId từ client khi kết nối
  socket.on("join", (userId: string) => {
    onlineUsers[userId] = socket.id;
    console.log(`${userId} connected with socket id ${socket.id}`);
  });

  // Nhận tin nhắn từ client
  socket.on("private_message", async (data) => {
    // data: { sender, receiver, content }
    const { sender, receiver, content } = data;
    
    // Kiểm tra thiếu trường hoặc trường rỗng 
    if (!sender || !receiver || !content) { 
      socket.emit("error_message", { error: "Thiếu thông tin gửi tin nhắn!" }); 
      return; 
    } 
 
    try { 
      const message = new Message({ sender, receiver, content }); 
      await message.save(); 
      
      // Gửi realtime cho người nhận nếu họ đang online
      const receiverSocketId = onlineUsers[receiver];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          sender, content, createdAt: message.createdAt,
        });
      }
      // Nếu muốn, có thể emit lại cho sender (nếu cần UI cập nhật realtime)
      socket.emit("private_message", {
        sender, content, createdAt: message.createdAt,
      });
    } catch (err) { 
      socket.emit("error_message", { error: "Không thể lưu tin nhắn." }); 
    } 
  });

  // Khi client ngắt kết nối
  socket.on("disconnect", () => {
    // Tìm userId theo socket.id và xóa
    for (const [userId, sId] of Object.entries(onlineUsers)) {
      if (sId === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
  });
});

// ... các phần trên
app.get("/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Không lấy được lịch sử tin nhắn" });
  }
});

// Khởi động server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

