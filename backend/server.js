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

// ✅ 8. SOCKET.IO EVENTS
io.on("connection", (socket) => {
  console.log("🔥 New user connected");

  // 🔵 Track Online Users
  socket.on("userOnline", (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });

  socket.on("userOffline", (userId) => {
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });

  // ✅ Join a room
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`✅ User joined room: ${roomId}`);
  });

  // ✅ SEND MESSAGE
  socket.on("sendMessage", async (data) => {
    const { senderId, text, roomId } = data;

    // Save to DB with status SENT
    const newMessage = await Message.create({
      sender: senderId,
      text,
      room: roomId,
      status: "sent",
    });
    await newMessage.populate("sender", "username");

    // Broadcast to all users in room
    io.to(roomId).emit("receiveMessage", newMessage);

    // Send back to sender for status update
    socket.emit("messageStatusUpdate", { id: newMessage._id, status: "sent" });
  });

  // ✅ MESSAGE STATUS HANDLERS
  socket.on("markDelivered", async (messageId) => {
    await Message.findByIdAndUpdate(messageId, { status: "delivered" });
    io.emit("messageStatusUpdate", { id: messageId, status: "delivered" });
  });

  socket.on("markRead", async (messageIds) => {
    await Message.updateMany({ _id: { $in: messageIds } }, { status: "read" });
    messageIds.forEach((id) => {
      io.emit("messageStatusUpdate", { id, status: "read" });
    });
  });

  // ✏️ EDIT MESSAGE
  socket.on("editMessage", async ({ messageId, newText }) => {
    const message = await Message.findById(messageId);
    if (!message) return;

    // ✅ Only allow edits within 15 min
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      socket.emit("editFailed", { messageId, reason: "Time limit passed" });
      return;
    }

    message.text = newText;
    message.edited = true;
    await message.save();

    io.to(message.room.toString()).emit("messageEdited", {
      id: message._id,
      newText,
    });
  });

  // 🗑️ DELETE MESSAGE
  socket.on("deleteMessage", async ({ messageId, forEveryone }) => {
    const message = await Message.findById(messageId);
    if (!message) return;

    if (forEveryone) {
      await Message.findByIdAndDelete(messageId);
      io.to(message.room.toString()).emit("messageDeleted", { id: messageId });
    } else {
      // delete for me (just remove on sender’s UI)
      socket.emit("messageDeletedForMe", { id: messageId });
    }
  });

  // 🔵 TYPING INDICATORS
  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("userTyping", data.username);
  });

  socket.on("stopTyping", (data) => {
    socket.to(data.roomId).emit("userStoppedTyping", data.username);
  });

  // ✅ DISCONNECT
  socket.on("disconnect", () => {
    const userId = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.values()));
    console.log("❌ User disconnected");
  });
});

// ✅ 9. START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
