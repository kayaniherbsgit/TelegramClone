import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
    edited: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "sent", "delivered", "read"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
