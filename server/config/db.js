const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) {
    throw new Error("Missing required environment variable: MONGO_URI");
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected successfully");
  });

  mongoose.connection.on("error", (error) => {
    console.error("❌ MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    retryWrites: true
  });
}

module.exports = { connectDB };
