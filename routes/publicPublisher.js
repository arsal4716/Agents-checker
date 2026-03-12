const express = require("express");
const router = express.Router();
const Snapshot = require("../models/Snapshot");
const { fetchAndSave } = require("../services/crmService");
const { buildExcel } = require("../utils/excelExport");

// GET /api/public/publisher/latest
router.get("/latest", async (req, res) => {
  try {
    const snapshot = await Snapshot.findOne({ systemType: "publisher" }).sort({ checkedAt: -1 });
    if (!snapshot) return res.json({ data: null, message: "No data yet." });
    return res.json({ data: snapshot });
  } catch {
    return res.status(500).json({ error: "Failed to fetch publisher data." });
  }
});

// GET /api/public/publisher/recent
router.get("/recent", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const snapshots = await Snapshot.find({ systemType: "publisher" })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .select("systemType checkedAt totalReady totalActive meta");
    return res.json({ data: snapshots });
  } catch {
    return res.status(500).json({ error: "Failed to fetch recent publisher data." });
  }
});

// GET /api/public/publisher/hourly
router.get("/hourly", async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 1, 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const hourly = await Snapshot.aggregate([
      { $match: { systemType: "publisher", checkedAt: { $gte: since } } },
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
      hour: `${h._id.year}-${String(h._id.month).padStart(2,"0")}-${String(h._id.day).padStart(2,"0")} ${String(h._id.hour).padStart(2,"0")}:00`,
      avgReady: Math.round(h.avgReady * 10) / 10,
      avgActive: Math.round(h.avgActive * 10) / 10,
      checkCount: h.checkCount,
      minReady: h.minReady,
      maxReady: h.maxReady,
    }));
    return res.json({ data: formatted });
  } catch {
    return res.status(500).json({ error: "Failed to compute hourly averages." });
  }
});

// GET /api/public/publisher/download
router.get("/download", async (req, res) => {
  try {
    const snapshot = await Snapshot.findOne({ systemType: "publisher" }).sort({ checkedAt: -1 });
    if (!snapshot) return res.status(404).json({ error: "No snapshot found." });
    const { buffer, filename } = buildExcel(snapshot);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch {
    return res.status(500).json({ error: "Failed to generate Excel file." });
  }
});

module.exports = router;
