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

// GET /api/stats/:type/latest — most recent snapshot
const getLatest = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  try {
    const snapshot = await Snapshot.findOne({ systemType: type }).sort({ checkedAt: -1 });
    if (!snapshot) return res.json({ data: null, message: "No data yet. Try refreshing." });
    return res.json({ data: snapshot });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch latest snapshot." });
  }
};

// POST /api/stats/:type/refresh — trigger a fresh fetch + save
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

// GET /api/stats/:type/recent — last N snapshots (default 20)
const getRecent = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const snapshots = await Snapshot.find({ systemType: type })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .select("systemType checkedAt totalReady totalActive meta");
    return res.json({ data: snapshots });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch recent snapshots." });
  }
};

// GET /api/stats/:type/hourly — hourly averages
const getHourlyAverages = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  // Default: last 24 hours, up to 7 days
  const days = Math.min(parseInt(req.query.days) || 1, 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const hourly = await Snapshot.aggregate([
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
    ]);

    const formatted = hourly.map((h) => ({
      hour: `${String(h._id.year)}-${String(h._id.month).padStart(2, "0")}-${String(h._id.day).padStart(2, "0")} ${String(h._id.hour).padStart(2, "0")}:00`,
      avgReady: Math.round(h.avgReady * 10) / 10,
      avgActive: Math.round(h.avgActive * 10) / 10,
      checkCount: h.checkCount,
      minReady: h.minReady,
      maxReady: h.maxReady,
    }));

    return res.json({ data: formatted });
  } catch (err) {
    return res.status(500).json({ error: "Failed to compute hourly averages." });
  }
};

// GET /api/stats/:type/download — Excel download of latest snapshot
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
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate Excel file." });
  }
};

module.exports = { getLatest, refresh, getRecent, getHourlyAverages, downloadExcel };
