import mongoose from "mongoose";
import dotenv from "dotenv";
import ChatRoom from "./models/ChatRoom.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    await ChatRoom.deleteMany(); // clear existing rooms
    await ChatRoom.insertMany([
      { name: "Alice" },
      { name: "Bob" },
      { name: "Charlie" }
    ]);

    console.log("✅ Rooms seeded");
    mongoose.connection.close();
  })
  .catch((err) => console.error("❌ Error:", err));
