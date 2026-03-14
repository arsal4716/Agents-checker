const Snapshot = require("../models/Snapshot");
const { fetchAndSave } = require("../services/crmService");
const { buildExcel } = require("../utils/excelExport");

const VALID_TYPES = ["hc", "lm", "pros", "publisher"];

function validateType(req, res) {
  const type = req.params.type || req.query.type || "hc";
  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `Invalid system type. Must be one of: ${VALID_TYPES.join(", ")}` });
    return null;
  }
  return type;
}

// GET /api/stats/:type/latest
const getLatest = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;
  try {
    const snapshot = await Snapshot.findOne({ systemType: type }).sort({ checkedAt: -1 });
    if (!snapshot) return res.json({ data: null, message: "No data yet. Try refreshing." });
    return res.json({ data: snapshot });
  } catch {
    return res.status(500).json({ error: "Failed to fetch latest snapshot." });
  }
};

// POST /api/stats/:type/refresh
const refresh = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;
  try {
    const snapshot = await fetchAndSave(type);
    return res.json({ data: snapshot });
  } catch (err) {
    console.error("Refresh error:", err.message);
    return res.status(500).json({ error: "Failed to fetch CRM data." });
  }
};

// GET /api/stats/:type/recent
// Optional: ?state=TX  → returns per-state ready/active from entries instead of totals
const getRecent = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const state = (req.query.state || "").trim().toUpperCase();

  try {
    if (state) {
      // Unwind entries and filter to the requested state
      const rows = await Snapshot.aggregate([
        { $match: { systemType: type } },
        { $sort: { checkedAt: -1 } },
        { $limit: limit },
        { $unwind: "$entries" },
        { $match: { "entries.state": state } },
        {
          $project: {
            _id: 1,
            checkedAt: 1,
            totalReady: { $toDouble: "$entries.ready" },
            totalActive: { $toDouble: "$entries.active" },
            meta: 1,
          },
        },
      ]);
      return res.json({ data: rows, filteredByState: state });
    }

    const snapshots = await Snapshot.find({ systemType: type })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .select("systemType checkedAt totalReady totalActive meta");
    return res.json({ data: snapshots });
  } catch {
    return res.status(500).json({ error: "Failed to fetch recent snapshots." });
  }
};

// GET /api/stats/:type/hourly
// Optional: ?state=TX  → averages only that state's ready/active per hour
const getHourlyAverages = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const days = Math.min(parseInt(req.query.days) || 1, 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const state = (req.query.state || "").trim().toUpperCase();

  try {
    let pipeline;

    if (state) {
      pipeline = [
        { $match: { systemType: type, checkedAt: { $gte: since } } },
        { $unwind: "$entries" },
        { $match: { "entries.state": state } },
        {
          $group: {
            _id: {
              year: { $year: "$checkedAt" },
              month: { $month: "$checkedAt" },
              day: { $dayOfMonth: "$checkedAt" },
              hour: { $hour: "$checkedAt" },
            },
            avgReady: { $avg: { $toDouble: "$entries.ready" } },
            avgActive: { $avg: { $toDouble: "$entries.active" } },
            checkCount: { $sum: 1 },
            minReady: { $min: { $toDouble: "$entries.ready" } },
            maxReady: { $max: { $toDouble: "$entries.ready" } },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1, "_id.hour": -1 } },
      ];
    } else {
      pipeline = [
        { $match: { systemType: type, checkedAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year: { $year: "$checkedAt" },
              month: { $month: "$checkedAt" },
              day: { $dayOfMonth: "$checkedAt" },
              hour: { $hour: "$checkedAt" },
            },
            avgReady: { $avg: "$totalReady" },
            avgActive: { $avg: "$totalActive" },
            checkCount: { $sum: 1 },
            minReady: { $min: "$totalReady" },
            maxReady: { $max: "$totalReady" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1, "_id.hour": -1 } },
      ];
    }

    const hourly = await Snapshot.aggregate(pipeline);

    const formatted = hourly.map((h) => ({
      hour: `${h._id.year}-${String(h._id.month).padStart(2,"0")}-${String(h._id.day).padStart(2,"0")} ${String(h._id.hour).padStart(2,"0")}:00`,
      avgReady: Math.round(h.avgReady * 10) / 10,
      avgActive: Math.round(h.avgActive * 10) / 10,
      checkCount: h.checkCount,
      minReady: h.minReady,
      maxReady: h.maxReady,
    }));

    return res.json({ data: formatted, filteredByState: state || null });
  } catch (err) {
    return res.status(500).json({ error: "Failed to compute hourly averages." });
  }
};

// GET /api/stats/:type/download
const downloadExcel = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;
  try {
    const snapshot = await Snapshot.findOne({ systemType: type }).sort({ checkedAt: -1 });
    if (!snapshot) return res.status(404).json({ error: "No snapshot found." });
    const { buffer, filename } = buildExcel(snapshot);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch {
    return res.status(500).json({ error: "Failed to generate Excel file." });
  }
};

module.exports = { getLatest, refresh, getRecent, getHourlyAverages, downloadExcel };
