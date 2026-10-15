const express = require("express");
const axios = require("axios");
const router = express.Router();

// Buyer identities are intentionally kept out of the response — only the
// anonymized b1/b2 ready flags and combined total are ever sent to the
// client.
const B1_URL = "https://bid.callgrid.com/api/bid/cmsrtmm64048a07k0tdkt5cuc";
const B2_URL = "https://bid.callgrid.com/api/bid/cmqzbspdd00zs06jysb5rb9yf";

const numbers = [
  { state: "AZ", phone: "14808940000" },
  { state: "OH", phone: "13305740000" },
  { state: "IN", phone: "13177690000" },
  { state: "MI", phone: "13135760000" },
  { state: "CO", phone: "17196320000" },
  { state: "FL", phone: "14076540000" },
  { state: "IA", phone: "13196620000" },
  { state: "IL", phone: "12172330000" },
  { state: "KS", phone: "17854250000" },
  { state: "LA", phone: "13379840000" },
  { state: "MO", phone: "18888430000" },
  { state: "MS", phone: "16623280000" },
  { state: "MT", phone: "14064425825" },
  { state: "NC", phone: "18286870000" },
  { state: "NE", phone: "14026710000" },
  { state: "OK", phone: "14055240000" },
  { state: "SC", phone: "18032540000" },
  { state: "TN", phone: "16158960000" },
  { state: "TX", phone: "17136810000" },
];

function isReady(data) {
  return Number(data?.code) === 1000 ? 1 : 0;
}

async function fetchB1(entry) {
  try {
    const res = await axios.get(B1_URL, {
      params: { CallerId: entry.phone },
      timeout: 10000,
    });
    return isReady(res.data);
  } catch {
    return 0;
  }
}

async function fetchB2(entry) {
  try {
    const res = await axios.post(
      B2_URL,
      { CallerId: entry.phone, InboundStateCode: entry.state },
      { timeout: 10000 }
    );
    return isReady(res.data);
  } catch {
    return 0;
  }
}

// GET /api/ww-agent-availability
router.get("/", async (req, res) => {
  try {
    const results = await Promise.all(
      numbers.map(async (entry) => {
        const [b1, b2] = await Promise.all([fetchB1(entry), fetchB2(entry)]);
        return { state: entry.state, b1, b2, combined: b1 + b2 };
      })
    );

    const totals = results.reduce(
      (acc, r) => {
        acc.b1 += r.b1;
        acc.b2 += r.b2;
        acc.combined += r.combined;
        return acc;
      },
      { b1: 0, b2: 0, combined: 0 }
    );

    return res.json({ success: true, data: results, totals });
  } catch {
    return res.status(500).json({ success: false, error: "Bulk fetch failed" });
  }
});

module.exports = router;
