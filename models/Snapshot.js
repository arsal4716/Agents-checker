const mongoose = require("mongoose");

// Company-wide agent-pool breakdown from the HC vendor's `agents` object.
// total/available/on_call/wrap_up/paused are the same across every state in
// a batch (they're not state-scoped) — kept here per-entry so each row
// reflects exactly what the vendor returned for that request.
const agentsBreakdownSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    on_call: { type: Number, default: 0 },
    wrap_up: { type: Number, default: 0 },
    paused: { type: Number, default: 0 },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    state: { type: String, required: true },
    phone: { type: String, default: "" },
    ready: { type: mongoose.Schema.Types.Mixed, default: 0 },
    active: { type: mongoose.Schema.Types.Mixed, default: 0 },
    reason: { type: String, default: "" },
    cause: { type: String, default: "" },
    hasError: { type: Boolean, default: false },
    agents: { type: agentsBreakdownSchema, default: () => ({}) },
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
