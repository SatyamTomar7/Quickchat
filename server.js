import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";

const app = express();
const server = http.createServer(app);

// ✅ Allowed frontend URLs
const allowedOrigins = [
  "http://localhost:5173",
  "https://quickchat-weld-seven.vercel.app"
];

// ✅ Middleware
app.use(express.json({ limit: "4mb" }));

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

// ✅ Socket connection
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  console.log("User Connected:", userId);

  if (userId) userSocketMap[userId] = socket.id;

  // send online users list
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User Disconnected:", userId);

    if (userId) delete userSocketMap[userId];

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// ✅ Routes
app.get("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// ✅ Connect DB
await connectDB();

// ✅ Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});