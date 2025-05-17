import { Server, Socket } from "socket.io";
import jwt from 'jsonwebtoken'; //Token JWT dùng để xác thực user khi kết nối Socket.

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
      // data: { to, content }
      const { to, content } = data;
      // Lưu DB
      // ... gọi model lưu message ...
      // Gửi đến người nhận nếu online
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
    //Lắng nghe sự kiện (Listening): Để nhận dữ liệu, bạn sẽ đăng ký một hàm xử lý (callback function) cho một sự kiện cụ thể. Hàm này sẽ được gọi khi sự kiện đó được phát đến socket mà nó đang lắng nghe.

    socket.on("disconnect", () => {
      if (userId) delete connectedUsers[userId];
    });
  });
}
