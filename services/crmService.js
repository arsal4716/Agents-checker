const axios = require("axios");
const { hcNumbers, lmNumbers, prosNumbers } = require("../data/phoneNumbers");
const Snapshot = require("../models/Snapshot");

const HC_BASE = "https://hcs.tldcrm.com/api/public/dialer/ready/";
const LM_BASE = "https://lm360.tldcrm.com/api/public/dialer/ready";
const PROS_BASE = "https://pros.tldcrm.com/api/public/dialer/ready";

function normalizeState(state) {
  return String(state || "").trim().toUpperCase();
}

function applyStateFilter(entries, stateFilter) {
  if (!stateFilter) return entries;
  const target = normalizeState(stateFilter);
  return entries.filter((e) => normalizeState(e.state) === target);
}

// ─── Individual fetch helpers ─────────────────────────────────────────────────

async function fetchHC(entry) {
  try {
    const res = await axios.get(
      `${HC_BASE}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
    );

    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: "ERR",
      active: "ERR",
      reason: "",
      cause: "",
      hasError: true,
    };
  }
}

async function fetchLM(entry) {
  try {
    const res = await axios.get(
      `${LM_BASE}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
    );

    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: "ERR",
      active: "ERR",
      reason: "ERR",
      cause: "ERR",
      hasError: true,
    };
  }
}

async function fetchPros(entry) {
  try {
    const res = await axios.get(
      `${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
    );

    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),
      reason: res.data.reason || "",
      cause: res.data.cause || "",
      hasError: false,
    };
  } catch {
    return {
      state: normalizeState(entry.state),
      phone: entry.phone,
      ready: "ERR",
      active: "ERR",
      reason: "",
      cause: "",
      hasError: true,
    };
  }
}

// ─── Publisher combined fetch ─────────────────────────────────────────────────

async function fetchPublisher(stateFilter) {
  const hcPromises = hcNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${HC_BASE}${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
      );
      return {
        state: normalizeState(entry.state),
        ready: Number(res.data.ready || 0),
        active: Number(res.data.active || 0),
      };
    } catch {
      return {
        state: normalizeState(entry.state),
        ready: 0,
        active: 0,
      };
    }
  });

  const lmPromises = lmNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${LM_BASE}/${entry.phone}?ava=1&ing=SRI_&sta=true&adg=true&cnt=true&act=true&rsn=true`
      );
      return {
        state: normalizeState(entry.state),
        ready: Number(res.data.ready || 0),
        active: Number(res.data.active || 0),
      };
    } catch {
      return {
        state: normalizeState(entry.state),
        ready: 0,
        active: 0,
      };
    }
  });

  const prosPromises = prosNumbers.map(async (entry) => {
    try {
      const res = await axios.get(
        `${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
      );

      return {
        state: normalizeState(entry.state),
        ready: Number(res.data.ready || 0),
        active: Number(res.data.active || 0),
      };
    } catch {
      return {
        state: normalizeState(entry.state),
        ready: 0,
        active: 0,
      };
    }
  });

  const [hcData, lmData, prosData] = await Promise.all([
    Promise.all(hcPromises),
    Promise.all(lmPromises),
    Promise.all(prosPromises),
  ]);

  const combined = {};

  [...hcData, ...lmData, ...prosData].forEach((row) => {
    if (!combined[row.state]) {
      combined[row.state] = {
        state: row.state,
        phone: "",
        ready: 0,
        active: 0,
        reason: "",
        cause: "",
        hasError: false,
      };
    }

    combined[row.state].ready += Number(row.ready || 0);
    combined[row.state].active += Number(row.active || 0);
  });

  let entries = Object.values(combined);

  entries = applyStateFilter(entries, stateFilter);
  entries.sort((a, b) => b.active - a.active);

  const totalReady = entries.reduce((sum, e) => sum + Number(e.ready || 0), 0);
  const totalActive = entries.reduce((sum, e) => sum + Number(e.active || 0), 0);

  return {
    systemType: "publisher",
    entries,
    totalReady,
    totalActive,
    meta: {
      successCount: entries.length,
      errorCount: 0,
      stateFilter: stateFilter ? normalizeState(stateFilter) : null,
    },
  };
}

// ─── System fetch ─────────────────────────────────────────────────────────────

async function fetchSystem(systemType, stateFilter) {
  let entries = [];

  if (systemType === "hc") {
    entries = await Promise.all(hcNumbers.map(fetchHC));
  } else if (systemType === "lm") {
    entries = await Promise.all(lmNumbers.map(fetchLM));
  } else if (systemType === "pros") {
    entries = await Promise.all(prosNumbers.map(fetchPros));
  } else if (systemType === "publisher") {
    return fetchPublisher(stateFilter);
  }

  const valid = entries.filter((e) => !e.hasError);
  const errors = entries.filter((e) => e.hasError);

  const filteredEntries = applyStateFilter(entries, stateFilter);
  const filteredValid = filteredEntries.filter((e) => !e.hasError);
  const filteredErrors = filteredEntries.filter((e) => e.hasError);

  const totalReady = filteredValid.reduce((sum, e) => sum + (Number(e.ready) || 0), 0);
  const totalActive = filteredValid.reduce((sum, e) => sum + (Number(e.active) || 0), 0);

  filteredEntries.sort((a, b) => Number(b.active || 0) - Number(a.active || 0));

  return {
    systemType,
    entries: filteredEntries,
    totalReady,
    totalActive,
    meta: {
      successCount: filteredValid.length,
      errorCount: filteredErrors.length,
      sourceSuccessCount: valid.length,
      sourceErrorCount: errors.length,
      stateFilter: stateFilter ? normalizeState(stateFilter) : null,
    },
  };
}

// ─── Save snapshot to MongoDB ─────────────────────────────────────────────────

async function fetchAndSave(systemType, stateFilter) {
  const data = await fetchSystem(systemType, stateFilter);

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

module.exports = { fetchSystem, fetchAndSave, normalizeState };