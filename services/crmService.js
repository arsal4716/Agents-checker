const axios = require("axios");
const { hcNumbers, lmNumbers, prosNumbers, publisherTotals } = require("../data/phoneNumbers");
const Snapshot = require("../models/Snapshot");

const HC_BASE = "https://hcs.tldcrm.com/api/public/dialer/ready/";
const LM_BASE = "https://lm360.tldcrm.com/api/public/dialer/ready";
const PROS_BASE = "https://pros.tldcrm.com/api/public/dialer/ready";

// ─── Individual fetch helpers ─────────────────────────────────────────────────

async function fetchHC(entry) {
  try {
    const res = await axios.get(
      `${HC_BASE}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
    );
    return {
      state: entry.state,
      phone: entry.phone,
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return { state: entry.state, phone: entry.phone, ready: "ERR", active: "ERR", reason: "", cause: "", hasError: true };
  }
}

async function fetchLM(entry) {
  try {
    const res = await axios.get(
      `${LM_BASE}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
    );
    return {
      state: entry.state,
      phone: entry.phone,
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return { state: entry.state, phone: entry.phone, ready: "ERR", active: "ERR", reason: "ERR", cause: "ERR", hasError: true };
  }
}

async function fetchPros(entry) {
  try {
    const res = await axios.get(
      `${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
    );
    const ready = Number(res.data.ready || 0);
    return {
      state: entry.state,
      phone: entry.phone,
      ready,
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return { state: entry.state, phone: entry.phone, ready: "ERR", active: "ERR", reason: "", cause: "", hasError: true };
  }
}

// ─── System fetch ─────────────────────────────────────────────────────────────

async function fetchSystem(systemType) {
  let entries = [];

  if (systemType === "hc") {
    entries = await Promise.all(hcNumbers.map(fetchHC));
  } else if (systemType === "lm") {
    entries = await Promise.all(lmNumbers.map(fetchLM));
  } else if (systemType === "pros") {
    entries = await Promise.all(prosNumbers.map(fetchPros));
  } else if (systemType === "publisher") {
    return fetchPublisher();
  }

  const valid = entries.filter((e) => !e.hasError);
  const errors = entries.filter((e) => e.hasError);

  const totalReady = valid.reduce((sum, e) => sum + (Number(e.ready) || 0), 0);
  const totalActive = valid.reduce((sum, e) => sum + (Number(e.active) || 0), 0);

  // Sort by active desc (same as original)
  entries.sort((a, b) => Number(b.active || 0) - Number(a.active || 0));

  return {
    systemType,
    entries,
    totalReady,
    totalActive,
    meta: { successCount: valid.length, errorCount: errors.length },
  };
}

// ─── Publisher combined fetch ─────────────────────────────────────────────────

async function fetchPublisher() {
  const hcPromises = hcNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${HC_BASE}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
      );
      return { state: entry.state, ready: Number(res.data.ready || 0), active: Number(res.data.active || 0) };
    } catch {
      return { state: entry.state, ready: 0, active: 0 };
    }
  });

  const lmPromises = lmNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${LM_BASE}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
      );
      return { state: entry.state, ready: Number(res.data.ready || 0), active: Number(res.data.active || 0) };
    } catch {
      return { state: entry.state, ready: 0, active: 0 };
    }
  });

  const prosPromises = prosNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
      );
      const ready = Number(res.data.ready || 0);
      if (ready === 0) return null;
      return { state: entry.state, ready, active: ready };
    } catch {
      return null;
    }
  });

  const [hcData, lmData, prosRaw] = await Promise.all([
    Promise.all(hcPromises),
    Promise.all(lmPromises),
    Promise.all(prosPromises),
  ]);

  const prosData = prosRaw.filter(Boolean);

  // Aggregate by state
  const combined = {};
  [...hcData, ...lmData, ...prosData].forEach((row) => {
    if (!combined[row.state]) combined[row.state] = { state: row.state, phone: "", ready: 0, active: 0, reason: "", cause: "", hasError: false };
    combined[row.state].ready += row.ready;
    combined[row.state].active += row.active;
  });

  const entries = Object.values(combined).sort((a, b) => b.active - a.active);
  const totalReady = entries.reduce((s, e) => s + e.ready, 0);
  const totalActive = entries.reduce((s, e) => s + e.active, 0);

  return {
    systemType: "publisher",
    entries,
    totalReady,
    totalActive,
    meta: { successCount: entries.length, errorCount: 0 },
  };
}

// ─── Save snapshot to MongoDB ─────────────────────────────────────────────────

async function fetchAndSave(systemType) {
  const data = await fetchSystem(systemType);
  const snapshot = new Snapshot({
    systemType: data.systemType,
    checkedAt: new Date(),
    totalReady: data.totalReady,
    totalActive: data.totalActive,
    entries: data.entries,
    meta: data.meta,
  });
  await snapshot.save();
  return snapshot;
}

module.exports = { fetchSystem, fetchAndSave };
