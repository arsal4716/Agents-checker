const axios = require("axios");
const { hcNumbers, lmNumbers, prosNumbers } = require("../data/phoneNumbers");
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
      state: entry.state, phone: entry.phone,
      ready: Number(res.data.ready || 0), active: Number(res.data.active || 0),
      reason: res.data.reason || "", cause: res.data.cause || "", hasError: false,
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
      state: entry.state, phone: entry.phone,
      ready: Number(res.data.ready || 0), active: Number(res.data.active || 0),
      reason: res.data.reason || "", cause: res.data.cause || "", hasError: false,
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
    return {
      state: entry.state, phone: entry.phone,
      ready: Number(res.data.ready || 0), active: Number(res.data.active || 0),
      reason: res.data.reason || "", cause: res.data.cause || "", hasError: false,
    };
  } catch {
    return { state: entry.state, phone: entry.phone, ready: "ERR", active: "ERR", reason: "", cause: "", hasError: true };
  }
}

// ─── Key insight: use TX entry as the true unique agent count ─────────────────
// One agent appears in every state queue they're licensed in.
// Since EVERY agent has TX, the TX queue count = actual unique agent headcount.
// Summing across states would multiply-count the same agents.

function getTxCount(entries) {
  const tx = entries.find((e) => e.state === "TX" && !e.hasError);
  return tx ? { ready: Number(tx.ready || 0), active: Number(tx.active || 0) } : { ready: 0, active: 0 };
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

  // Use TX count as canonical agent headcount — NOT a sum across states
  const { ready: totalReady, active: totalActive } = getTxCount(entries);

  // Sort by active desc for display
  entries.sort((a, b) => Number(b.active || 0) - Number(a.active || 0));

  return {
    systemType, entries, totalReady, totalActive,
    meta: { successCount: valid.length, errorCount: errors.length },
  };
}

// ─── Publisher combined fetch ─────────────────────────────────────────────────

async function fetchPublisher() {
  const hcPromises = hcNumbers.map(async (entry) => {
    try {
      const res = await axios.get(`${HC_BASE}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`);
      return { state: entry.state, ready: Number(res.data.ready || 0), active: Number(res.data.active || 0), hasError: false };
    } catch { return { state: entry.state, ready: 0, active: 0, hasError: true }; }
  });

  const lmPromises = lmNumbers.map(async (entry) => {
    try {
      const res = await axios.get(`${LM_BASE}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`);
      return { state: entry.state, ready: Number(res.data.ready || 0), active: Number(res.data.active || 0), hasError: false };
    } catch { return { state: entry.state, ready: 0, active: 0, hasError: true }; }
  });

  const prosPromises = prosNumbers.map(async (entry) => {
    try {
      const res = await axios.get(`${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`);
      return { state: entry.state, ready: Number(res.data.ready || 0), active: Number(res.data.active || 0), hasError: false };
    } catch { return { state: entry.state, ready: 0, active: 0, hasError: true }; }
  });

  const [hcData, lmData, prosData] = await Promise.all([
    Promise.all(hcPromises),
    Promise.all(lmPromises),
    Promise.all(prosPromises),
  ]);

  // Aggregate per-state display data (used for the breakdown table only)
  const combined = {};
  [...hcData, ...lmData, ...prosData].forEach((row) => {
    if (!combined[row.state]) combined[row.state] = { state: row.state, phone: "", ready: 0, active: 0, reason: "", cause: "", hasError: false };
    combined[row.state].ready += row.ready;
    combined[row.state].active += row.active;
  });
  const entries = Object.values(combined).sort((a, b) => b.active - a.active);

  // True agent count per system = TX entry for each system (every agent has TX)
  // Then sum across systems because HC/LM/PROS agents are different people
  const hcTx = getTxCount(hcData);
  const lmTx = getTxCount(lmData);
  const prosTx = getTxCount(prosData);

  const totalReady  = hcTx.ready  + lmTx.ready  + prosTx.ready;
  const totalActive = hcTx.active + lmTx.active + prosTx.active;

  return {
    systemType: "publisher", entries, totalReady, totalActive,
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
