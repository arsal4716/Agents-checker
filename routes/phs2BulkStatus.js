const express = require("express");
const axios = require("axios");
const router = express.Router();

const BASE_URL =
  "https://bid.callgrid.com/api/bid/cmn6507vj00vz06juii3memo2";

// All required states added
const phs2Numbers = [
  { state: "AZ", phone: "14808940000" }, // Arizona
  { state: "CO", phone: "17196320000" }, // Colorado
  { state: "FL", phone: "14076540000" }, // Florida
  { state: "IA", phone: "13196620000" }, // Iowa
  { state: "IL", phone: "12172330000" }, // Illinois
  { state: "IN", phone: "13177690000" }, // Indiana
  { state: "KS", phone: "17854250000" }, // Kansas
  { state: "LA", phone: "13379840000" }, // Louisiana
  { state: "MI", phone: "13135760000" }, // Michigan
  { state: "MO", phone: "18888430000" }, // Missouri
  { state: "MS", phone: "16623280000" }, // Mississippi
  { state: "MT", phone: "NO_NUMBER_FOUND" }, // Montana
  { state: "NC", phone: "18286870000" }, // North Carolina
  { state: "NE", phone: "14026710000" }, // Nebraska
  { state: "OH", phone: "13305740000" }, // Ohio
  { state: "OK", phone: "14055240000" }, // Oklahoma
  { state: "SC", phone: "18032540000" }, // South Carolina
  { state: "TN", phone: "16158960000" }, // Tennessee
  { state: "TX", phone: "17136810000" }, // Texas
];

async function fetchOne(entry) {
  try {
    if (entry.phone === "NO_NUMBER_FOUND") {
      return {
        state: entry.state,
        phone: null,
        id: null,
        code: "MISSING_PHONE",
        bid: null,
        message: "Phone number not available",
      };
    }

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
    const results = await Promise.all(phs2Numbers.map(fetchOne));

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