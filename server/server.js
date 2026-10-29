require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db");

async function start() {
  for (const key of [
    "MONGO_URI",
    "ROBOFLOW_API_KEY",
    "ROBOFLOW_WORKSPACE",
    "ROBOFLOW_WORKFLOW"
  ]) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  await connectDB(process.env.MONGO_URI);

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`✅ Backend ready on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("❌ Server startup failed:", error.message);
  process.exit(1);
});
