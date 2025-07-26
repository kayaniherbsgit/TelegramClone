import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Message from "../models/Message.js";
import ChatRoom from "../models/ChatRoom.js";

const router = express.Router();

// ✅ Get all rooms
router.get("/rooms", protect, async (req, res) => {
  try {
    const rooms = await ChatRoom.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get messages for a specific room
router.get("/:roomId", protect, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "username")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Send message to a specific room
router.post("/:roomId", protect, async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.create({
      sender: req.user.id,
      text,
      room: req.params.roomId
    });
    await message.populate("sender", "username");
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/seed", async (req, res) => {
  try {
    const rooms = await ChatRoom.insertMany([
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" }
    ]);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;
