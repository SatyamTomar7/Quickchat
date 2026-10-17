import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { connectDB } from "./lib/db.js";
import Message from "./models/Message.js";
import { isValidObjectId } from "./lib/validation.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

const app = express();
const server = http.createServer(app);

// ✅ Allowed frontend URLs
const allowedOrigins = [
  "http://localhost:5173",
  "https://quickchat-weld-seven.vercel.app",
  process.env.CLIENT_URL
].filter(Boolean);

// ✅ Middleware
app.use(express.json({ limit: "7mb" }));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Socket.io setup
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// ✅ Store online users
export const userSocketMap = {};

export const emitToUser = (userId, event, payload) => {
  const sockets = userSocketMap[userId.toString()];
  if (sockets) {
    for (const socketId of sockets) io.to(socketId).emit(event, payload);
  }
};

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Authentication required"));
  }
});

// ✅ Socket connection
io.on("connection", (socket) => {
  const userId = socket.userId.toString();

  if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
  userSocketMap[userId].add(socket.id);

  Message.find({ receiverId: userId, status: "sent" })
    .select("_id senderId")
    .lean()
    .then(async (pendingMessages) => {
      if (!pendingMessages.length) return;
      await Message.updateMany(
        { receiverId: userId, status: "sent" },
        { $set: { status: "delivered" } },
      );
      for (const message of pendingMessages) {
        emitToUser(message.senderId, "messageStatus", {
          messageId: message._id,
          status: "delivered",
        });
      }
    })
    .catch((error) => console.error("Pending delivery update failed:", error.message));

  // send online users list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    userSocketMap[userId]?.delete(socket.id);
    if (!userSocketMap[userId]?.size) delete userSocketMap[userId];

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("typing:start", (payload) => {
    const receiverId = payload?.receiverId;
    if (!isValidObjectId(receiverId) || receiverId === userId) return;
    emitToUser(receiverId, "typing:start", { userId });
  });

  socket.on("typing:stop", (payload) => {
    const receiverId = payload?.receiverId;
    if (!isValidObjectId(receiverId) || receiverId === userId) return;
    emitToUser(receiverId, "typing:stop", { userId });
  });
});

// ✅ Routes
app.get("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request payload is too large" });
  }
  console.error("Unhandled server error:", error.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ✅ Connect DB
await connectDB();

// ✅ Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});