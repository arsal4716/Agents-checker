const express = require("express");
const axios = require("axios");
const router = express.Router();

const BASE_URL =
  "https://bid.callgrid.com/api/bid/cmn6507vj00vz06juii3memo2";

const phs2Numbers = [
  { state: "TN", phone: "16158960000" },
  { state: "FL", phone: "14076540000" },
  { state: "LA", phone: "13379840000" },
  { state: "MI", phone: "13135760000" },
  { state: "NC", phone: "18286870000" },
  { state: "SC", phone: "18032540000" },
  { state: "MS", phone: "16623280000" },
  { state: "OK", phone: "14055240000" },
  { state: "NE", phone: "14026710000" },
];

async function fetchOne(entry) {
  try {
    const res = await axios.get(BASE_URL, {
      params: { CallerId: entry.phone },
      timeout: 10000,
    });

    return {
      state: entry.state,
      phone: entry.phone,
      id: res.data.id,
      code: res.data.code,
      bid: res.data.dynamicBid || null,
      message: res.data.message || "SUCCESS",
    };
  } catch (err) {
    return {
      state: entry.state,
      phone: entry.phone,
      id: null,
      code: "ERROR",
      bid: null,
      message: err.response?.data?.message || "Request failed",
    };
  }
}

// GET /api/phs2-bulk-status
router.get("/", async (req, res) => {
  try {
    const results = await Promise.all(
      phs2Numbers.map(fetchOne)
    );

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Bulk fetch failed",
    });
  }
});

module.exports = router;