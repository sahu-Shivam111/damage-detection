const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
  filename: String,
  counts: {
    total: Number,
    damaged: Number,
    noVisibleDamage: Number,
    uncertain: Number
  },
  objects: [{
    _id: false,
    id: Number,
    name: String,
    condition: String,
    reason: String,
    box: [Number]
  }]
}, { timestamps: true });

const Inspection = mongoose.model("Inspection", inspectionSchema);

module.exports = Inspection;
