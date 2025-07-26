import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate("sender", "username") // ✅ include username of sender
      .sort({ createdAt: 1 }); // oldest → newest
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) return res.status(400).json({ message: "Message text required" });

    const newMessage = await Message.create({
      sender: req.user.id,
      text,
    });

    await newMessage.populate("sender", "username"); // ✅ attach sender info

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
