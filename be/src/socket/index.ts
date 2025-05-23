import { Server, Socket } from "socket.io";
import jwt from 'jsonwebtoken';

const connectedUsers: { [userId: string]: string } = {}; // userId => socket.id

export function socketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {
    // Nhận userId từ client qua query hoặc event xác thực
    const token = socket.handshake.auth?.token;
    let userId = "";
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      userId = decoded.userId;
      connectedUsers[userId] = socket.id;
    } catch {
      socket.disconnect();
      return;
    }

    // Gửi nhận tin nhắn
    socket.on("private_message", async (data) => {
      const { to, content } = data;
      const receiverSocketId = connectedUsers[to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          from: userId,
          content,
          createdAt: new Date()
        });
      }
      // Nếu offline thì lưu DB, client sẽ fetch khi online lại
    });

    // Xử lý disconnect
    socket.on("disconnect", () => {
      if (userId) delete connectedUsers[userId];
    });
  });
}
