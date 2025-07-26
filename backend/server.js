import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

import Message from "./models/Message.js";
import User from "./models/User.js";

// ✅ 1. Load environment variables
dotenv.config();

// ✅ 2. Initialize Express & Socket.IO server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ 3. Middlewares
app.use(cors());
app.use(express.json());

// ✅ 4. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ✅ 5. Protected Test Route
app.get("/api/secure-data", protect, (req, res) => {
  res.json({ message: "You are authorized!", user: req.user });
});

// ✅ 6. Root Endpoint
app.get("/", (req, res) => {
  res.send("🚀 Telegram Clone API is running");
});

// ✅ 7. MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Online Users Memory Store
const onlineUsers = new Map(); // { socket.id: userId }

// ✅ 8. Socket.IO for real-time chat
io.on("connection", (socket) => {
  console.log("🔥 New user connected");

  // 🔵 Track online users
  socket.on("userOnline", (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });

  socket.on("userOffline", (userId) => {
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });

  // ✅ Join Room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`✅ User joined room: ${roomId}`);
  });

  // ✅ Send message
  socket.on("sendMessage", async (data) => {
    const { senderId, text, roomId } = data;

    // Save to DB
    const newMessage = await Message.create({ sender: senderId, text, room: roomId });
    await newMessage.populate("sender", "username");

    // Send to ONLY people in that room
    io.to(roomId).emit("receiveMessage", newMessage);
  });

  // 🔵 Typing indicators
  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("userTyping", data.username);
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.roomId).emit("userStoppedTyping", data.username);
  });

  // ✅ Disconnect
  socket.on("disconnect", () => {
    const userId = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
    console.log("❌ User disconnected");
  });
});

// ✅ 9. Start the Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
