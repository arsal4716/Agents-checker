const axios = require("axios");
const { hcNumbers, lmNumbers, prosNumbers } = require("../data/phoneNumbers");
const Snapshot = require("../models/Snapshot");

const HC_VENDOR_API =
  "https://api.nextgeninsurancesolutionsinc.com/vendor-availability";
const PROS_BASE = "https://pros.tldcrm.com/api/public/dialer/ready";

// NEW LM360 API
const LM_BASE =
  "https://lm360.tldcrm.com/api/vendor/ping/34065/5762d5a82f65730fdcb0200688d17b4b";


async function fetchHC(entry) {
  try {
    const res = await axios.get(HC_VENDOR_API, {
      params: {
        state: entry.state,
        caller_id: entry.phone,
      },
      timeout: 8000,
    });

    const data = res.data;

    return {
      state: data.state || entry.state,
      phone: entry.phone,

      ready: Number(
        data.state_available_now ??
        data.agents?.state_available ??
        data.ready ??
        0
      ),
      active: Number(
        data.state_licensed ??
        data.agents?.state_licensed ??
        0
      ),

      reason: data.message || "",
      cause: data.vendor || "",

      hasError: false,
    };
  } catch (err) {
    console.error("HC ERROR");
    console.error("State:", entry.state);
    console.error("Status:", err.response?.status);
    console.error("Response:", err.response?.data || err.message);

    return {
      state: entry.state,
      phone: entry.phone,
      ready: 0,
      active: 0,
      reason: err.response?.data?.message || err.message || "Unknown error",
      cause: "",
      hasError: true,
    };
  }
}
// ─── NEW LM360 ─────────────────────────────────────────────────────

async function fetchLM(entry) {
  try {
    const res = await axios.get(`${LM_BASE}/${entry.phone}`);

    return {
      state: entry.state,
      phone: entry.phone,

      // IMPORTANT
      ready: Number(res.data.ready || 0),
      active: Number(res.data.active || 0),

      reason: res.data.reason || "",
      cause: res.data.cause || "",

      hasError: false,
    };
  } catch (err) {
    console.log("LM ERROR:", entry.phone, err.message);

    return {
      state: entry.state,
      phone: entry.phone,
      ready: "ERR",
      active: "ERR",
      reason: "ERR",
      cause: "ERR",
      hasError: true,
    };
  }
}

// ─── PROS ──────────────────────────────────────────────────────────

async function fetchPros(entry) {
  try {
    const res = await axios.get(
      `${PROS_BASE}/${entry.phone}?ava=1&sta=true&adg=true&cnt=true&act=true&rsn=true&ing=SRI_`
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
    return {
      state: entry.state,
      phone: entry.phone,
      ready: "ERR",
      active: "ERR",
      reason: "",
      cause: "",
      hasError: true,
    };
  }
}

function getTxCount(entries) {
  const tx = entries.find(
    (e) => e.state === "TX" && !e.hasError
  );

  return tx
    ? {
      ready: Number(tx.ready || 0),
      active: Number(tx.active || 0),
    }
    : {
      ready: 0,
      active: 0,
    };
}

// ─── MAIN FETCH ────────────────────────────────────────────────────

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

  // TX used as master count
  const { ready: totalReady, active: totalActive } =
    getTxCount(entries);

  // Sort highest active first
  entries.sort(
    (a, b) => Number(b.active || 0) - Number(a.active || 0)
  );

  return {
    systemType,
    entries,
    totalReady,
    totalActive,
    meta: {
      successCount: valid.length,
      errorCount: errors.length,
    },
  };
}

// ─── PUBLISHER COMBINED ───────────────────────────────────────────

async function fetchPublisher() {
  const hcPromises = hcNumbers.map(fetchHC);
  const lmPromises = lmNumbers.map(fetchLM);
  const prosPromises = prosNumbers.map(fetchPros);

  const [hcData, lmData, prosData] = await Promise.all([
    Promise.all(hcPromises),
    Promise.all(lmPromises),
    Promise.all(prosPromises),
  ]);

  // Combine by state
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

  const entries = Object.values(combined).sort(
    (a, b) => b.active - a.active
  );

  // TX totals
  const hcTx = getTxCount(hcData);
  const lmTx = getTxCount(lmData);
  const prosTx = getTxCount(prosData);

  const totalReady =
    hcTx.ready + lmTx.ready + prosTx.ready;

  const totalActive =
    hcTx.active + lmTx.active + prosTx.active;

  return {
    systemType: "publisher",
    entries,
    totalReady,
    totalActive,
    meta: {
      successCount: entries.length,
      errorCount: 0,
    },
  };
}

// ─── SAVE SNAPSHOT ────────────────────────────────────────────────

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

module.exports = {
  fetchSystem,
  fetchAndSave,
};
