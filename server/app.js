const express = require("express");
const cors = require("cors");
const multer = require("multer");
const inspectionRoutes = require("./routes/inspectionRoutes");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
}));

app.use("/api", inspectionRoutes);

app.use((error, req, res, next) => {
  console.error("Request failed:", error.message);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE"
        ? "Maximum upload size is 5 MB."
        : "Invalid upload."
    });
  }

  if (error.message === "Upload a JPEG, PNG, or WebP image.") {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({
    error: "Inspection failed. Check the server configuration and try again."
  });
});

module.exports = app;
