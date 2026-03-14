const Snapshot = require("../models/Snapshot");
const { fetchAndSave, normalizeState } = require("../services/crmService");
const { buildExcel } = require("../utils/excelExport");

const VALID_TYPES = ["hc", "lm", "pros", "publisher"];

function validateType(req, res) {
  const type = req.params.type || req.query.type || "hc";
  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({
      error: `Invalid system type. Must be one of: ${VALID_TYPES.join(", ")}`
    });
    return null;
  }
  return type;
}

function getStateFilter(req) {
  const state = req.query.state ? normalizeState(req.query.state) : null;
  return state || null;
}

function computeSnapshotTotals(snapshot, stateFilter) {
  if (!snapshot) return null;

  if (!stateFilter) {
    return {
      ...snapshot.toObject(),
      filteredTotalReady: snapshot.totalReady,
      filteredTotalActive: snapshot.totalActive,
      filteredEntries: snapshot.entries,
    };
  }

  const entries = (snapshot.entries || []).filter(
    (e) => normalizeState(e.state) === stateFilter
  );

  const filteredTotalReady = entries.reduce((sum, e) => sum + (Number(e.ready) || 0), 0);
  const filteredTotalActive = entries.reduce((sum, e) => sum + (Number(e.active) || 0), 0);

  return {
    ...snapshot.toObject(),
    filteredTotalReady,
    filteredTotalActive,
    filteredEntries: entries,
    stateFilter,
  };
}

// GET /api/stats/:type/latest
const getLatest = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const stateFilter = getStateFilter(req);

  try {
    const snapshot = await Snapshot.findOne({ systemType: type }).sort({ checkedAt: -1 });
    if (!snapshot) {
      return res.json({ data: null, message: "No data yet. Try refreshing." });
    }

    return res.json({ data: computeSnapshotTotals(snapshot, stateFilter) });
  } catch {
    return res.status(500).json({ error: "Failed to fetch latest snapshot." });
  }
};

// POST /api/stats/:type/refresh
const refresh = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const stateFilter = getStateFilter(req);

  try {
    const snapshot = await fetchAndSave(type, stateFilter);
    return res.json({ data: snapshot });
  } catch (err) {
    console.error("Refresh error:", err.message);
    return res.status(500).json({ error: "Failed to fetch CRM data." });
  }
};

// GET /api/stats/:type/recent
const getRecent = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const stateFilter = getStateFilter(req);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const snapshots = await Snapshot.find({ systemType: type })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .select("systemType checkedAt totalReady totalActive meta entries");

    const data = snapshots.map((snap) => {
      if (!stateFilter) {
        return {
          _id: snap._id,
          systemType: snap.systemType,
          checkedAt: snap.checkedAt,
          totalReady: snap.totalReady,
          totalActive: snap.totalActive,
          meta: snap.meta,
        };
      }

      const entries = (snap.entries || []).filter(
        (e) => normalizeState(e.state) === stateFilter
      );

      const totalReady = entries.reduce((sum, e) => sum + (Number(e.ready) || 0), 0);
      const totalActive = entries.reduce((sum, e) => sum + (Number(e.active) || 0), 0);

      return {
        _id: snap._id,
        systemType: snap.systemType,
        checkedAt: snap.checkedAt,
        totalReady,
        totalActive,
        stateFilter,
        meta: snap.meta,
      };
    });

    return res.json({ data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch recent snapshots." });
  }
};

// GET /api/stats/:type/hourly
const getHourlyAverages = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const stateFilter = getStateFilter(req);
  const days = Math.min(parseInt(req.query.days) || 1, 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const snapshots = await Snapshot.find({
      systemType: type,
      checkedAt: { $gte: since },
    }).select("checkedAt totalReady totalActive entries");

    const bucketMap = new Map();

    for (const snap of snapshots) {
      const d = new Date(snap.checkedAt);

      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const hour = d.getUTCHours();

      const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:00`;

      let ready = snap.totalReady;
      let active = snap.totalActive;

      if (stateFilter) {
        const entries = (snap.entries || []).filter(
          (e) => normalizeState(e.state) === stateFilter
        );

        ready = entries.reduce((sum, e) => sum + (Number(e.ready) || 0), 0);
        active = entries.reduce((sum, e) => sum + (Number(e.active) || 0), 0);
      }

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          hour: key,
          readyValues: [],
          activeValues: [],
        });
      }

      const bucket = bucketMap.get(key);
      bucket.readyValues.push(ready);
      bucket.activeValues.push(active);
    }

    const formatted = Array.from(bucketMap.values())
      .map((bucket) => {
        const readyValues = bucket.readyValues;
        const activeValues = bucket.activeValues;

        const avgReady = readyValues.reduce((a, b) => a + b, 0) / readyValues.length;
        const avgActive = activeValues.reduce((a, b) => a + b, 0) / activeValues.length;

        return {
          hour: bucket.hour,
          avgReady: Math.round(avgReady * 10) / 10,
          avgActive: Math.round(avgActive * 10) / 10,
          checkCount: readyValues.length,
          minReady: Math.min(...readyValues),
          maxReady: Math.max(...readyValues),
          stateFilter,
        };
      })
      .sort((a, b) => new Date(b.hour) - new Date(a.hour));

    return res.json({ data: formatted });
  } catch {
    return res.status(500).json({ error: "Failed to compute hourly averages." });
  }
};

// GET /api/stats/:type/download
const downloadExcel = async (req, res) => {
  const type = validateType(req, res);
  if (!type) return;

  const stateFilter = getStateFilter(req);

  try {
    const snapshot = await Snapshot.findOne({ systemType: type }).sort({ checkedAt: -1 });
    if (!snapshot) return res.status(404).json({ error: "No snapshot found." });

    const exportSnapshot = computeSnapshotTotals(snapshot, stateFilter);

    const payload = {
      ...snapshot.toObject(),
      totalReady: exportSnapshot.filteredTotalReady,
      totalActive: exportSnapshot.filteredTotalActive,
      entries: exportSnapshot.filteredEntries,
    };

    const { buffer, filename } = buildExcel(payload);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return res.send(buffer);
  } catch {
    return res.status(500).json({ error: "Failed to generate Excel file." });
  }
};

module.exports = {
  getLatest,
  refresh,
  getRecent,
  getHourlyAverages,
  downloadExcel,
};