const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    state: { type: String, required: true },
    phone: { type: String, default: "" },
    ready: { type: mongoose.Schema.Types.Mixed, default: 0 },
    active: { type: mongoose.Schema.Types.Mixed, default: 0 },
    reason: { type: String, default: "" },
    cause: { type: String, default: "" },
    hasError: { type: Boolean, default: false },
  },
  { _id: false }
);

const snapshotSchema = new mongoose.Schema({
  systemType: {
    type: String,
    enum: ["hc", "lm", "pros", "publisher"],
    required: true,
    index: true,
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  totalReady: { type: Number, default: 0 },
  totalActive: { type: Number, default: 0 },
  entries: [entrySchema],
  meta: {
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
});

// Index for efficient hourly queries
snapshotSchema.index({ systemType: 1, checkedAt: -1 });

module.exports = mongoose.model("Snapshot", snapshotSchema);
